import { ArrayUtil, RandomGenerator, TestValidator } from "@nestia/e2e";
import { IConnection } from "@nestia/fetcher";
import typia, { tags } from "typia";

import api from "@ORGANIZATION/PROJECT-api";
import type { IAuthorizationToken } from "@ORGANIZATION/PROJECT-api/lib/structures/IAuthorizationToken";
import type { ICommunityPlatformCommunity } from "@ORGANIZATION/PROJECT-api/lib/structures/ICommunityPlatformCommunity";
import type { ICommunityPlatformMemberUser } from "@ORGANIZATION/PROJECT-api/lib/structures/ICommunityPlatformMemberUser";
import type { ICommunityPlatformPost } from "@ORGANIZATION/PROJECT-api/lib/structures/ICommunityPlatformPost";
import type { IECommunityPlatformPostType } from "@ORGANIZATION/PROJECT-api/lib/structures/IECommunityPlatformPostType";
import type { IECommunityPlatformPostVisibilityState } from "@ORGANIZATION/PROJECT-api/lib/structures/IECommunityPlatformPostVisibilityState";
import type { IECommunityVisibility } from "@ORGANIZATION/PROJECT-api/lib/structures/IECommunityVisibility";

/**
 * Happy path: create a TEXT post with a non-empty body by an authenticated
 * member.
 *
 * Workflow:
 *
 * 1. Member registration (join) returns authorized identity and SDK-managed token
 * 2. Create a community (capture communityId)
 * 3. Create a TEXT post in that community with title + body only
 *
 * Validations:
 *
 * - Response types match DTOs (typia.assert)
 * - Post belongs to the created community and authored by the joined member
 * - Post.type is "TEXT" and post.body/title are preserved
 */
export async function test_api_post_create_text_success_by_member(
  connection: api.IConnection,
) {
  // 1) Register member (join) and capture authorized user context
  const member = await api.functional.auth.memberUser.join(connection, {
    body: {
      email: typia.random<string & tags.Format<"email">>(),
      username: `${RandomGenerator.alphabets(6)}_${RandomGenerator.alphabets(3)}`,
      password: "Abc12345!", // >=8, has letters and digits
      terms_accepted_at: new Date().toISOString(),
      privacy_accepted_at: new Date().toISOString(),
      marketing_opt_in: true,
    } satisfies ICommunityPlatformMemberUser.ICreate,
  });
  typia.assert(member);

  // 2) Create a community and capture its id
  const community =
    await api.functional.communityPlatform.memberUser.communities.create(
      connection,
      {
        body: {
          name: `r_${RandomGenerator.alphabets(10)}`,
          visibility: "public",
          nsfw: false,
          auto_archive_days: 30,
        } satisfies ICommunityPlatformCommunity.ICreate,
      },
    );
  typia.assert(community);

  // 3) Create a TEXT post in that community with a non-empty body
  const textTitle = RandomGenerator.paragraph({ sentences: 3 }); // short title
  const textBody = RandomGenerator.content({
    paragraphs: 1,
    sentenceMin: 5,
    sentenceMax: 15,
  });
  const post =
    await api.functional.communityPlatform.memberUser.communities.posts.create(
      connection,
      {
        communityId: community.id,
        body: {
          title: textTitle,
          type: "TEXT",
          body: textBody,
          nsfw: false,
          spoiler: false,
        } satisfies ICommunityPlatformPost.ICreate,
      },
    );
  typia.assert(post);

  // Referential integrity and discriminator/content validations
  TestValidator.equals(
    "post belongs to the created community",
    post.community_platform_community_id,
    community.id,
  );
  TestValidator.equals(
    "post authored by the joined member",
    post.community_platform_user_id,
    member.id,
  );
  TestValidator.equals("post type is TEXT", post.type, "TEXT");
  TestValidator.equals("post title preserved", post.title, textTitle);
  TestValidator.equals("post body preserved", post.body, textBody);
}
