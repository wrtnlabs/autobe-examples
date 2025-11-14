import { ArrayUtil, RandomGenerator, TestValidator } from "@nestia/e2e";
import { IConnection } from "@nestia/fetcher";
import typia, { tags } from "typia";

import api from "@ORGANIZATION/PROJECT-api";
import type { IAuthorizationToken } from "@ORGANIZATION/PROJECT-api/lib/structures/IAuthorizationToken";
import type { ICommunityPlatformMember } from "@ORGANIZATION/PROJECT-api/lib/structures/ICommunityPlatformMember";
import type { ICommunityPlatformPost } from "@ORGANIZATION/PROJECT-api/lib/structures/ICommunityPlatformPost";

export async function test_api_post_update_by_author(
  connection: api.IConnection,
) {
  const communityCode = RandomGenerator.alphaNumeric(8);
  const postCode = typia.random<string & tags.Format<"uuid">>();

  const updatedPost: ICommunityPlatformPost =
    await api.functional.communityPlatform.member.communities.posts.updatePost(
      connection,
      {
        communityCode: communityCode,
        postCode: postCode,
        body: RandomGenerator.content(),
      },
    );
  typia.assert(updatedPost);
}
