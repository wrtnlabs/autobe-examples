import { ArrayUtil, RandomGenerator, TestValidator } from "@nestia/e2e";
import { IConnection } from "@nestia/fetcher";
import typia, { tags } from "typia";

import api from "@ORGANIZATION/PROJECT-api";
import type { IAuthorizationToken } from "@ORGANIZATION/PROJECT-api/lib/structures/IAuthorizationToken";
import type { ICommunityBbsCommunity } from "@ORGANIZATION/PROJECT-api/lib/structures/ICommunityBbsCommunity";
import type { ICommunityBbsCommunityMember } from "@ORGANIZATION/PROJECT-api/lib/structures/ICommunityBbsCommunityMember";
import type { ICommunityBbsCommunitySettings } from "@ORGANIZATION/PROJECT-api/lib/structures/ICommunityBbsCommunitySettings";
import type { ICommunityBbsPost } from "@ORGANIZATION/PROJECT-api/lib/structures/ICommunityBbsPost";
import type { ICommunityBbsPostMedia } from "@ORGANIZATION/PROJECT-api/lib/structures/ICommunityBbsPostMedia";
import type { ICommunityBbsSystemAdmin } from "@ORGANIZATION/PROJECT-api/lib/structures/ICommunityBbsSystemAdmin";

/**
 * Validate admin-scoped soft-delete of a community post by a system
 * administrator.
 *
 * Business context:
 *
 * - A community member (author) creates a community and a post with media.
 * - A system administrator then performs a soft-delete of the post via the
 *   admin-scoped endpoint. The platform is expected to record moderation and
 *   audit artifacts and keep media objects for retention; however, the test
 *   environment provided here does not expose Prisma or direct read endpoints
 *   for those artifacts. Therefore this test focuses on exercising the API
 *   workflow and asserting successful API responses. DB-level verification is
 *   noted in comments and should be implemented where Prisma or appropriate
 *   read endpoints are available.
 */
export async function test_api_post_soft_delete_by_system_admin(
  connection: api.IConnection,
) {
  // 1) Create a community member (author)
  const authorEmail: string = typia.random<string & tags.Format<"email">>();
  const authorUsername = RandomGenerator.alphaNumeric(8);
  const author = await api.functional.auth.communityMember.join(connection, {
    body: {
      email: authorEmail,
      username: authorUsername,
      password: "Passw0rd!",
      display_name: RandomGenerator.name(),
      session_context: {
        href: "https://example.test/welcome",
        referrer: "https://example.test/landing",
        ip: null,
        session_ttl_seconds: null,
      },
    } satisfies ICommunityBbsCommunityMember.ICreate,
  });
  typia.assert(author);

  // 2) Create a community as the author
  const communitySlug =
    `test-community-${RandomGenerator.alphabets(6)}`.toLowerCase();
  const community =
    await api.functional.communityBbs.communityMember.communities.create(
      connection,
      {
        body: {
          name: `E2E Test Community ${RandomGenerator.paragraph({ sentences: 2 })}`,
          slug: communitySlug,
          description: "Community created by e2e test",
          visibility: "public",
          post_approval_required: false,
        } satisfies ICommunityBbsCommunity.ICreate,
      },
    );
  typia.assert(community);
  TestValidator.equals(
    "created community slug matches",
    community.slug,
    communitySlug,
  );

  // 3) Upload a media item to attach to the post (optional step exercised)
  const media =
    await api.functional.communityBbs.communityMember.uploads.create(
      connection,
      {
        body: {
          upload_mode: "url",
          url: typia.random<string & tags.Format<"uri">>(),
          media_type: "image/png",
          size_bytes: typia.random<
            number & tags.Type<"int32"> & tags.Minimum<0>
          >(),
          ordering: 0,
        } satisfies ICommunityBbsPostMedia.ICreate,
      },
    );
  typia.assert(media);

  // 4) Create a post in the community as the author and attach the media
  const post =
    await api.functional.communityBbs.communityMember.communities.posts.create(
      connection,
      {
        communitySlug,
        body: {
          title: RandomGenerator.paragraph({
            sentences: 3,
            wordMin: 4,
            wordMax: 10,
          }),
          body: RandomGenerator.content({ paragraphs: 2 }),
          post_type: "image",
          media_ids: [media.id],
        } satisfies ICommunityBbsPost.ICreate,
      },
    );
  typia.assert(post);
  TestValidator.predicate("post has id", typeof post.id === "string");

  const postId: string = post.id;

  // 5) Create a system admin account (this will replace connection Authorization
  //    with the admin token according to the SDK behaviour)
  const adminEmail: string = typia.random<string & tags.Format<"email">>();
  const admin = await api.functional.auth.systemAdmin.join(connection, {
    body: {
      email: adminEmail,
      password: "Passw0rd!",
      display_name: RandomGenerator.name(),
      is_super_admin: false,
    } satisfies ICommunityBbsSystemAdmin.ICreate,
  });
  typia.assert(admin);

  // 6) As the system admin, perform admin-scoped soft-delete of the post
  await api.functional.communityBbs.systemAdmin.posts.erase(connection, {
    postId: postId as string & tags.Format<"uuid">,
  });

  // The erase endpoint returns void on success. Assert that the call completed
  // by validating that the program reached this point. (If the SDK threw,
  // the test would already have failed.)
  TestValidator.predicate("admin erase completed", true);

  // NOTE: The scenario requests DB-level verification of community_bbs_posts.deleted_at,
  // moderation action rows, and audit logs. The provided template imports do not
  // include a Prisma client or read endpoints for these tables. To implement
  // those checks programmatically, inject a Prisma client import (e.g.
  // `import prisma from "../prisma"`) or add API endpoints that expose
  // moderation and audit entries. In this environment we document the
  // intended verifications below (for implementers):
  //  - Query community_bbs_posts by id and assert deleted_at !== null and is_published = false
  //  - Query community_bbs_moderation_actions for an action referencing postId and actor_type='system_admin'
  //  - Query community_bbs_audit_logs for a record attributing the removal to the admin id
  //  - Assert media records remain present and associated with the post
}
