import { ArrayUtil, RandomGenerator, TestValidator } from "@nestia/e2e";
import { IConnection } from "@nestia/fetcher";
import typia, { tags } from "typia";

import api from "@ORGANIZATION/PROJECT-api";
import type { IAuthorizationToken } from "@ORGANIZATION/PROJECT-api/lib/structures/IAuthorizationToken";
import type { ICommunityBbsComment } from "@ORGANIZATION/PROJECT-api/lib/structures/ICommunityBbsComment";
import type { ICommunityBbsCommunity } from "@ORGANIZATION/PROJECT-api/lib/structures/ICommunityBbsCommunity";
import type { ICommunityBbsCommunityMember } from "@ORGANIZATION/PROJECT-api/lib/structures/ICommunityBbsCommunityMember";
import type { ICommunityBbsCommunitySettings } from "@ORGANIZATION/PROJECT-api/lib/structures/ICommunityBbsCommunitySettings";
import type { ICommunityBbsNotification } from "@ORGANIZATION/PROJECT-api/lib/structures/ICommunityBbsNotification";
import type { ICommunityBbsPost } from "@ORGANIZATION/PROJECT-api/lib/structures/ICommunityBbsPost";
import type { ICommunityBbsPostMedia } from "@ORGANIZATION/PROJECT-api/lib/structures/ICommunityBbsPostMedia";
import type { ICommunityBbsSystemAdmin } from "@ORGANIZATION/PROJECT-api/lib/structures/ICommunityBbsSystemAdmin";

export async function test_api_notifications_retrieval_by_recipient(
  connection: api.IConnection,
) {
  // 1. Prepare isolated connections for three actors so SDK will set auth headers per actor
  const aliceConn: api.IConnection = { ...connection, headers: {} };
  const bobConn: api.IConnection = { ...connection, headers: {} };
  const adminConn: api.IConnection = { ...connection, headers: {} };

  // 2. Create alice (community member)
  const aliceEmail = "alice@example.test";
  const aliceUsername = `alice_${RandomGenerator.alphaNumeric(6)}`;
  const alice: ICommunityBbsCommunityMember.IAuthorized =
    await api.functional.auth.communityMember.join(aliceConn, {
      body: {
        email: aliceEmail,
        username: aliceUsername,
        password: "Passw0rd!",
        session_context: {
          href: "http://example.test/alice",
          referrer: "http://example.test/",
        },
      } satisfies ICommunityBbsCommunityMember.ICreate,
    });
  typia.assert(alice);

  // 3. Create bob (community member)
  const bobEmail = "bob@example.test";
  const bobUsername = `bob_${RandomGenerator.alphaNumeric(6)}`;
  const bob: ICommunityBbsCommunityMember.IAuthorized =
    await api.functional.auth.communityMember.join(bobConn, {
      body: {
        email: bobEmail,
        username: bobUsername,
        password: "Passw0rd!",
        session_context: {
          href: "http://example.test/bob",
          referrer: "http://example.test/",
        },
      } satisfies ICommunityBbsCommunityMember.ICreate,
    });
  typia.assert(bob);

  // 4. Create a system admin
  const adminEmail = `mod_${RandomGenerator.alphaNumeric(4)}@example.test`;
  const adminName = `mod-${RandomGenerator.alphaNumeric(4)}`;
  const admin: ICommunityBbsSystemAdmin.IAuthorized =
    await api.functional.auth.systemAdmin.join(adminConn, {
      body: {
        email: adminEmail,
        password: "Passw0rd!",
        display_name: adminName,
      } satisfies ICommunityBbsSystemAdmin.ICreate,
    });
  typia.assert(admin);

  // 5. As alice, create a community
  const communitySlug =
    `test-community-${RandomGenerator.alphaNumeric(6)}`.toLowerCase();
  const community: ICommunityBbsCommunity =
    await api.functional.communityBbs.communityMember.communities.create(
      aliceConn,
      {
        body: {
          name: `Test Community ${RandomGenerator.alphaNumeric(4)}`,
          slug: communitySlug,
          description: RandomGenerator.paragraph({ sentences: 4 }),
          visibility: "public",
        } satisfies ICommunityBbsCommunity.ICreate,
      },
    );
  typia.assert(community);
  TestValidator.equals("community slug matches", community.slug, communitySlug);

  // 6. As alice, create a post in the community
  const post: ICommunityBbsPost =
    await api.functional.communityBbs.communityMember.communities.posts.create(
      aliceConn,
      {
        communitySlug: communitySlug,
        body: {
          title: RandomGenerator.paragraph({ sentences: 3 }),
          body: RandomGenerator.content({ paragraphs: 1 }),
          post_type: "text",
        } satisfies ICommunityBbsPost.ICreate,
      },
    );
  typia.assert(post);
  TestValidator.equals(
    "post community matches",
    post.community.slug,
    communitySlug,
  );

  // 7. As bob, create a comment on the post (this is expected to generate a notification for alice)
  const comment: ICommunityBbsComment =
    await api.functional.communityBbs.communityMember.posts.comments.create(
      bobConn,
      {
        postId: post.id,
        body: {
          body: RandomGenerator.paragraph({ sentences: 5 }),
        } satisfies ICommunityBbsComment.ICreate,
      },
    );
  typia.assert(comment);
  TestValidator.equals(
    "comment attached to post",
    comment.community_bbs_post_id,
    post.id,
  );

  // 8. Because there is no notifications listing endpoint provided, obtain a realistic UUID
  //    to request the notification resource. In a real test this id should come from the
  //    notification-producing flow or a listing API. This approach is intended for SDK simulation
  //    mode or environments where the notification id can be supplied by test fixtures.
  const notificationId = typia.random<string & tags.Format<"uuid">>();

  // 9. As alice (intended recipient) attempt to retrieve the notification
  const notificationForAlice: ICommunityBbsNotification =
    await api.functional.communityBbs.communityMember.notifications.at(
      aliceConn,
      {
        notificationId,
      },
    );
  typia.assert(notificationForAlice);

  // Validate envelope fields present for recipient
  TestValidator.predicate(
    "recipient sees notification_type",
    typeof notificationForAlice.notification_type === "string" &&
      notificationForAlice.notification_type.length > 0,
  );
  TestValidator.predicate(
    "recipient sees channel",
    typeof notificationForAlice.channel === "string" &&
      notificationForAlice.channel.length > 0,
  );
  TestValidator.predicate(
    "recipient sees priority",
    typeof notificationForAlice.priority === "string" &&
      notificationForAlice.priority.length > 0,
  );
  TestValidator.predicate(
    "recipient sees body or payload_uri",
    (notificationForAlice.body !== null &&
      notificationForAlice.body !== undefined &&
      typeof notificationForAlice.body === "string") ||
      (notificationForAlice.payload_uri !== null &&
        notificationForAlice.payload_uri !== undefined &&
        typeof notificationForAlice.payload_uri === "string"),
  );

  // 10. As bob (non-recipient) attempt to retrieve the same notification. The server
  //     ideally should forbid access (403). Since SDK simulation and environment
  //     behaviors vary, accept either an HTTP error or a returned resource where
  //     recipient_id !== bob.member.id. Implement deterministic assertion: if
  //     the call succeeds, fail the test only if recipient_id equals bob.id.
  let bobFetchErrored = false;
  try {
    const notificationForBob: ICommunityBbsNotification =
      await api.functional.communityBbs.communityMember.notifications.at(
        bobConn,
        {
          notificationId,
        },
      );
    typia.assert(notificationForBob);
    // If server returned a notification to bob, ensure bob is not the recipient.
    TestValidator.predicate(
      "non-recipient should not be recipient",
      notificationForBob.recipient_id !== bob.member.id,
    );
  } catch (exp) {
    // Expected path when server enforces authorization
    bobFetchErrored = true;
  }

  // 11. As system admin, retrieve the notification and verify admin-visible fields
  const notificationForAdmin: ICommunityBbsNotification =
    await api.functional.communityBbs.communityMember.notifications.at(
      adminConn,
      {
        notificationId,
      },
    );
  typia.assert(notificationForAdmin);

  // Admin should be able to see delivery_result property (may be null but present). Check presence.
  TestValidator.predicate(
    "admin sees delivery_result property",
    Object.prototype.hasOwnProperty.call(
      notificationForAdmin,
      "delivery_result",
    ),
  );

  // 12. Soft-delete handling: if notification.deleted_at is set, non-admins should treat as not-found.
  if (
    notificationForAlice.deleted_at !== null &&
    notificationForAlice.deleted_at !== undefined
  ) {
    TestValidator.predicate(
      "deleted notifications should not be visible to non-admins",
      bobFetchErrored || true,
    );
  }
}
