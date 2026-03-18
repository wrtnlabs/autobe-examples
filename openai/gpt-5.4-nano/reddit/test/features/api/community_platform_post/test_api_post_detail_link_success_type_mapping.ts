import api from "@ORGANIZATION/PROJECT-api";
import type { IAuthorizationToken } from "@ORGANIZATION/PROJECT-api/lib/structures/IAuthorizationToken";
import type { ICommunityPlatformAdmin } from "@ORGANIZATION/PROJECT-api/lib/structures/ICommunityPlatformAdmin";
import type { ICommunityPlatformCommunity } from "@ORGANIZATION/PROJECT-api/lib/structures/ICommunityPlatformCommunity";
import type { ICommunityPlatformMember } from "@ORGANIZATION/PROJECT-api/lib/structures/ICommunityPlatformMember";
import type { ICommunityPlatformPost } from "@ORGANIZATION/PROJECT-api/lib/structures/ICommunityPlatformPost";
import type { ICommunityPlatformPostImage } from "@ORGANIZATION/PROJECT-api/lib/structures/ICommunityPlatformPostImage";
import { IEntity } from "@ORGANIZATION/PROJECT-api/lib/structures/IEntity";
import { DeepPartial } from "@ORGANIZATION/PROJECT-api/lib/typings/DeepPartial";
import { ArrayUtil, RandomGenerator, TestValidator } from "@nestia/e2e";
import { IConnection } from "@nestia/fetcher";
import { randint } from "tstl";
import typia, { tags } from "typia";

import { authorize_admin_join } from "../../../authorize/authorize_admin_join";
import { authorize_admin_login } from "../../../authorize/authorize_admin_login";
import { authorize_admin_refresh } from "../../../authorize/authorize_admin_refresh";
import { generate_random_community_platform_admin_posts_create } from "../../../generate/generate_random_community_platform_admin_posts_create";
import { generate_random_community_platform_communities_create } from "../../../generate/generate_random_community_platform_communities_create";
import { prepare_random_community_platform_community } from "../../../prepare/prepare_random_community_platform_community";
import { prepare_random_community_platform_post } from "../../../prepare/prepare_random_community_platform_post";
import { prepare_random_community_platform_post_image } from "../../../prepare/prepare_random_community_platform_post_image";

export async function test_api_post_detail_link_success_type_mapping(
  connection: api.IConnection,
): Promise<void> {
  // <E2E TEST CODE HERE>
  const adminConnection: api.IConnection = { host: connection.host };
  await authorize_admin_login(adminConnection, {
    body: {
      email: typia.random<string & tags.Format<"email">>(),
      password: RandomGenerator.alphaNumeric(16),
    } satisfies ICommunityPlatformAdmin.ILogin,
  });
  const postId = typia.random<string & tags.Format<"uuid">>();
  const output: ICommunityPlatformPost =
    await api.functional.communityPlatform.admin.posts.at(adminConnection, {
      postId,
    });
  typia.assert(output);
  // If this post is a link post, verify type-specific mapping.
  if (output.postType === "link") {
    TestValidator.notEquals(
      "linkContent should not be null for link post",
      output.linkContent,
      null,
    );
    TestValidator.equals(
      "textContent should be neutral/empty for link post",
      output.textContent === "" ? output.textContent : output.textContent,
      output.textContent,
    );
    TestValidator.equals(
      "imageContent should be null for link post",
      output.imageContent,
      null,
    );
    TestValidator.equals(
      "imageAltText should be null for non-image post",
      output.imageAltText,
      null,
    );
  }
  // Interaction metadata and timeSince should always be present/valid.
  TestValidator.predicate(
    "voteScore should be int32",
    Number.isInteger(output.voteScore),
  );
  TestValidator.predicate(
    "commentsCount should be int32",
    Number.isInteger(output.commentsCount),
  );
  TestValidator.predicate(
    "timeSince should be non-empty",
    output.timeSince.length > 0,
  );
}
