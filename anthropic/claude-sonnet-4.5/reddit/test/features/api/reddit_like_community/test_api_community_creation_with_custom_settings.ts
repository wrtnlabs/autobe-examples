import { ArrayUtil, RandomGenerator, TestValidator } from "@nestia/e2e";
import { IConnection } from "@nestia/fetcher";
import typia, { tags } from "typia";

import api from "@ORGANIZATION/PROJECT-api";
import type { IAuthorizationToken } from "@ORGANIZATION/PROJECT-api/lib/structures/IAuthorizationToken";
import type { IRedditLikeCommunity } from "@ORGANIZATION/PROJECT-api/lib/structures/IRedditLikeCommunity";
import type { IRedditLikeMember } from "@ORGANIZATION/PROJECT-api/lib/structures/IRedditLikeMember";

export async function test_api_community_creation_with_custom_settings(
  connection: api.IConnection,
) {
  // Step 1: Create and authenticate a member account
  const memberEmail = typia.random<string & tags.Format<"email">>();
  const memberPassword = typia.random<string & tags.MinLength<8>>();

  const member = await api.functional.auth.member.join(connection, {
    body: {
      username: typia.random<
        string &
          tags.MinLength<3> &
          tags.MaxLength<20> &
          tags.Pattern<"^[a-zA-Z0-9_-]+$">
      >(),
      email: memberEmail,
      password: memberPassword,
    } satisfies IRedditLikeMember.ICreate,
  });
  typia.assert(member);

  // Step 2: Create community with custom settings
  const privacyTypes = ["public", "private"] as const;
  const postingPermissions = [
    "anyone_subscribed",
    "approved_only",
    "moderators_only",
  ] as const;
  const categories = [
    "technology",
    "gaming",
    "news",
    "entertainment",
    "science",
  ] as const;

  const communityData = {
    code: typia.random<
      string &
        tags.MinLength<3> &
        tags.MaxLength<25> &
        tags.Pattern<"^[a-zA-Z0-9_]+$">
    >(),
    name: typia.random<string & tags.MinLength<3> & tags.MaxLength<25>>(),
    description: typia.random<
      string & tags.MinLength<10> & tags.MaxLength<500>
    >(),
    icon_url: typia.random<string & tags.Format<"url">>(),
    banner_url: typia.random<string & tags.Format<"url">>(),
    privacy_type: RandomGenerator.pick(privacyTypes),
    posting_permission: RandomGenerator.pick(postingPermissions),
    allow_text_posts: typia.random<boolean>(),
    allow_link_posts: typia.random<boolean>(),
    allow_image_posts: typia.random<boolean>(),
    primary_category: RandomGenerator.pick(categories),
    secondary_tags: ArrayUtil.repeat(
      typia.random<
        number & tags.Type<"uint32"> & tags.Minimum<1> & tags.Maximum<3>
      >(),
      () => RandomGenerator.name(1),
    ).join(","),
  } satisfies IRedditLikeCommunity.ICreate;

  const createdCommunity =
    await api.functional.redditLike.member.communities.create(connection, {
      body: communityData,
    });
  typia.assert(createdCommunity);

  // Step 3: Validate all custom settings are properly stored
  TestValidator.equals(
    "community code matches",
    createdCommunity.code,
    communityData.code,
  );
  TestValidator.equals(
    "community name matches",
    createdCommunity.name,
    communityData.name,
  );
  TestValidator.equals(
    "community description matches",
    createdCommunity.description,
    communityData.description,
  );
  TestValidator.equals(
    "icon URL matches",
    createdCommunity.icon_url,
    communityData.icon_url,
  );
  TestValidator.equals(
    "banner URL matches",
    createdCommunity.banner_url,
    communityData.banner_url,
  );
  TestValidator.equals(
    "privacy type matches",
    createdCommunity.privacy_type,
    communityData.privacy_type,
  );
  TestValidator.equals(
    "posting permission matches",
    createdCommunity.posting_permission,
    communityData.posting_permission,
  );
  TestValidator.equals(
    "allow text posts matches",
    createdCommunity.allow_text_posts,
    communityData.allow_text_posts,
  );
  TestValidator.equals(
    "allow link posts matches",
    createdCommunity.allow_link_posts,
    communityData.allow_link_posts,
  );
  TestValidator.equals(
    "allow image posts matches",
    createdCommunity.allow_image_posts,
    communityData.allow_image_posts,
  );
  TestValidator.equals(
    "primary category matches",
    createdCommunity.primary_category,
    communityData.primary_category,
  );
  TestValidator.equals(
    "secondary tags match",
    createdCommunity.secondary_tags,
    communityData.secondary_tags,
  );

  // Step 4: Validate community metadata (business logic only)
  TestValidator.equals(
    "initial subscriber count is zero",
    createdCommunity.subscriber_count,
    0,
  );
  TestValidator.equals(
    "community is not archived",
    createdCommunity.is_archived,
    false,
  );
}
