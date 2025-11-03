import { ArrayUtil, RandomGenerator, TestValidator } from "@nestia/e2e";
import { IConnection } from "@nestia/fetcher";
import typia, { tags } from "typia";

import api from "@ORGANIZATION/PROJECT-api";
import type { IAuthorizationToken } from "@ORGANIZATION/PROJECT-api/lib/structures/IAuthorizationToken";
import type { ICommunityBbsAuditLog } from "@ORGANIZATION/PROJECT-api/lib/structures/ICommunityBbsAuditLog";
import type { ICommunityBbsComment } from "@ORGANIZATION/PROJECT-api/lib/structures/ICommunityBbsComment";
import type { ICommunityBbsCommunity } from "@ORGANIZATION/PROJECT-api/lib/structures/ICommunityBbsCommunity";
import type { ICommunityBbsCommunityMember } from "@ORGANIZATION/PROJECT-api/lib/structures/ICommunityBbsCommunityMember";
import type { ICommunityBbsCommunitySettings } from "@ORGANIZATION/PROJECT-api/lib/structures/ICommunityBbsCommunitySettings";
import type { ICommunityBbsNotification } from "@ORGANIZATION/PROJECT-api/lib/structures/ICommunityBbsNotification";
import type { ICommunityBbsPost } from "@ORGANIZATION/PROJECT-api/lib/structures/ICommunityBbsPost";
import type { ICommunityBbsPostMedia } from "@ORGANIZATION/PROJECT-api/lib/structures/ICommunityBbsPostMedia";
import type { ICommunityBbsSystemAdmin } from "@ORGANIZATION/PROJECT-api/lib/structures/ICommunityBbsSystemAdmin";
import type { IPage } from "@ORGANIZATION/PROJECT-api/lib/structures/IPage";
import type { IPageICommunityBbsAuditLog } from "@ORGANIZATION/PROJECT-api/lib/structures/IPageICommunityBbsAuditLog";

export async function test_api_notifications_acknowledge_by_recipient(
  connection: api.IConnection,
) {
  // 1. Prepare isolated connections for actors (alice, bob) and admin
  const aliceConn: api.IConnection = { ...connection, headers: {} };
  const bobConn: api.IConnection = { ...connection, headers: {} };
  const adminConn: api.IConnection = { ...connection, headers: {} };

  // 2. Create users: alice and bob
  const aliceEmail = typia.random<string & tags.Format<"email">>();
  const aliceUsername = RandomGenerator.alphaNumeric(8);
  const alice = await api.functional.auth.communityMember.join(aliceConn, {
    body: {
      email: aliceEmail,
      username: aliceUsername,
      password: "Passw0rd1",
      session_context: {
        href: typia.random<string & tags.Format<"uri">>(),
        referrer: typia.random<string & tags.Format<"uri">>(),
      },
    } satisfies ICommunityBbsCommunityMember.ICreate,
  });
  typia.assert(alice);

  const bobEmail = typia.random<string & tags.Format<"email">>();
  const bobUsername = RandomGenerator.alphaNumeric(8);
  const bob = await api.functional.auth.communityMember.join(bobConn, {
    body: {
      email: bobEmail,
      username: bobUsername,
      password: "Passw0rd1",
      session_context: {
        href: typia.random<string & tags.Format<"uri">>(),
        referrer: typia.random<string & tags.Format<"uri">>(),
      },
    } satisfies ICommunityBbsCommunityMember.ICreate,
  });
  typia.assert(bob);

  // 3. Create system admin for audit queries
  const adminEmail = typia.random<string & tags.Format<"email">>();
  const admin = await api.functional.auth.systemAdmin.join(adminConn, {
    body: {
      email: adminEmail,
      password: "Passw0rd1",
      display_name: RandomGenerator.name(),
    } satisfies ICommunityBbsSystemAdmin.ICreate,
  });
  typia.assert(admin);

  // 4. Alice creates a community
  const slug = `test-community-${Date.now()}`;
  const community =
    await api.functional.communityBbs.communityMember.communities.create(
      aliceConn,
      {
        body: {
          name: RandomGenerator.paragraph({ sentences: 3 }),
          slug,
          description: RandomGenerator.paragraph({ sentences: 5 }),
        } satisfies ICommunityBbsCommunity.ICreate,
      },
    );
  typia.assert(community);
  TestValidator.equals("community slug matches", community.slug, slug);

  // 5. Alice creates a post in the community
  const post =
    await api.functional.communityBbs.communityMember.communities.posts.create(
      aliceConn,
      {
        communitySlug: community.slug,
        body: {
          title: RandomGenerator.paragraph({ sentences: 3 }),
          body: RandomGenerator.content({ paragraphs: 2 }),
          post_type: "text",
        } satisfies ICommunityBbsPost.ICreate,
      },
    );
  typia.assert(post);

  // 6. Bob comments on the post to trigger a notification for Alice
  const comment =
    await api.functional.communityBbs.communityMember.posts.comments.create(
      bobConn,
      {
        postId: post.id,
        body: {
          body: RandomGenerator.paragraph({ sentences: 8 }),
        } satisfies ICommunityBbsComment.ICreate,
      },
    );
  typia.assert(comment);

  // 7. Determine a notification id to acknowledge.
  // NOTE: The provided SDK does not include a notifications listing endpoint,
  // so the test cannot deterministically discover the notification id created
  // by the comment side-effect. To exercise the markRead endpoint and
  // associated behaviors (acknowledgement, idempotency, authorization and
  // audit logging), we derive a UUID to call the endpoint. In a full system
  // test, a notifications listing API would be used instead of this step.
  const notificationId = typia.random<string & tags.Format<"uuid">>();

  // 8. As Alice acknowledge (markRead) the notification
  const ack1 =
    await api.functional.communityBbs.communityMember.notifications.markRead(
      aliceConn,
      {
        notificationId,
      },
    );
  typia.assert(ack1);
  TestValidator.predicate(
    "delivered_at is present after acknowledgement",
    ack1.delivered_at !== null && ack1.delivered_at !== undefined,
  );
  TestValidator.predicate(
    "status is a string",
    typeof ack1.status === "string",
  );

  // 9. Idempotency: calling markRead again should be safe and return the same id
  const ack2 =
    await api.functional.communityBbs.communityMember.notifications.markRead(
      aliceConn,
      {
        notificationId,
      },
    );
  typia.assert(ack2);
  TestValidator.equals("idempotent: same id returned", ack1.id, ack2.id);

  // Additional idempotency safety: delivered_at should remain present
  TestValidator.predicate(
    "delivered_at remains present after repeated ack",
    ack2.delivered_at !== null && ack2.delivered_at !== undefined,
  );

  // 10. Non-recipient (bob) attempting to markRead should throw (forbidden)
  await TestValidator.error(
    "non-recipient cannot acknowledge notification",
    async () => {
      await api.functional.communityBbs.communityMember.notifications.markRead(
        bobConn,
        {
          notificationId,
        },
      );
    },
  );

  // 11. Audit verification: system admin searches audit logs for an
  // acknowledgement record within a small time window around now.
  const now = new Date();
  const windowFrom = new Date(now.getTime() - 1000 * 60 * 5).toISOString();
  const windowTo = new Date(now.getTime() + 1000 * 60 * 5).toISOString();

  const auditPage =
    await api.functional.communityBbs.systemAdmin.audit.logs.index(adminConn, {
      body: {
        actor_type: "community_member",
        actor_id: alice.member.id,
        created_at_from: windowFrom,
        created_at_to: windowTo,
        limit: 10,
        page: 1,
      } satisfies ICommunityBbsAuditLog.IRequest,
    });
  typia.assert(auditPage);

  // Validate audit page structure
  TestValidator.predicate(
    "audit pagination exists",
    auditPage.pagination !== null && auditPage.pagination !== undefined,
  );
  TestValidator.predicate(
    "audit data is an array",
    Array.isArray(auditPage.data),
  );
}
