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
 * Create a LINK post as a logged-in member and validate LINK-specific behavior.
 *
 * Steps:
 *
 * 1. Register (join) a member user to obtain an authenticated session.
 * 2. Create a community to publish into.
 * 3. Create a LINK post with a valid https URL using the community.
 * 4. Validate: type is LINK; link_url matches input; body/image_url are absent;
 *    author and community references are correct; payload matches schema.
 */
export async function test_api_post_create_link_success_by_member(
  connection: api.IConnection,
) {
  // 1) Register and authenticate a member user
  const email: string & tags.Format<"email"> = typia.random<
    string & tags.Format<"email">
  >();
  const username: string = `${RandomGenerator.alphaNumeric(10)}`; // matches ^[A-Za-z0-9_]{3,20}$
  const password: string = `A1${RandomGenerator.alphaNumeric(10)}`; // ensures letter+digit and length >= 8
  const nowIso: string & tags.Format<"date-time"> =
    new Date().toISOString() as string & tags.Format<"date-time">;

  const joinBody = {
    email,
    username,
    password,
    terms_accepted_at: nowIso,
    privacy_accepted_at: nowIso,
    marketing_opt_in: true,
  } satisfies ICommunityPlatformMemberUser.ICreate;

  const authorized: ICommunityPlatformMemberUser.IAuthorized =
    await api.functional.auth.memberUser.join(connection, { body: joinBody });
  typia.assert(authorized);

  // 2) Create a community
  const visibilityOptions = ["public", "restricted", "private"] as const;
  const visibility = RandomGenerator.pick(visibilityOptions);
  const communityCreateBody = {
    name: `c-${RandomGenerator.alphaNumeric(12)}`,
    display_name: RandomGenerator.paragraph({
      sentences: 2,
      wordMin: 3,
      wordMax: 8,
    }),
    description: RandomGenerator.content({
      paragraphs: 1,
      sentenceMin: 3,
      sentenceMax: 6,
      wordMin: 3,
      wordMax: 8,
    }),
    visibility,
    nsfw: false,
    auto_archive_days: typia.random<
      number & tags.Type<"int32"> & tags.Minimum<30>
    >() satisfies number as number,
    language: "en",
    region: "US",
  } satisfies ICommunityPlatformCommunity.ICreate;

  const community: ICommunityPlatformCommunity =
    await api.functional.communityPlatform.memberUser.communities.create(
      connection,
      {
        body: communityCreateBody,
      },
    );
  typia.assert(community);

  // 3) Create a LINK post in the created community
  const title: string = RandomGenerator.paragraph({
    sentences: 6,
    wordMin: 3,
    wordMax: 8,
  }); // 1-300 chars realistic
  const linkUrl: string = `https://example.com/${RandomGenerator.alphaNumeric(12)}`;

  const postCreateBody = {
    title,
    type: "LINK",
    link_url: linkUrl,
    nsfw: false,
    spoiler: false,
  } satisfies ICommunityPlatformPost.ICreate;

  const post: ICommunityPlatformPost =
    await api.functional.communityPlatform.memberUser.communities.posts.create(
      connection,
      {
        communityId: community.id,
        body: postCreateBody,
      },
    );
  typia.assert(post);

  // 4) Validations: type, link_url, omitted fields, and referential integrity
  TestValidator.equals("post type is LINK", post.type, "LINK");
  TestValidator.equals("post.link_url matches input", post.link_url, linkUrl);
  TestValidator.predicate(
    "TEXT body is absent for LINK post",
    post.body === null || post.body === undefined,
  );
  TestValidator.predicate(
    "IMAGE url is absent for LINK post",
    post.image_url === null || post.image_url === undefined,
  );
  TestValidator.equals(
    "community reference matches created community",
    post.community_platform_community_id,
    community.id,
  );
  TestValidator.equals(
    "author reference matches authenticated user",
    post.community_platform_user_id,
    authorized.id,
  );
}
