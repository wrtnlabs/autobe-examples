import api from "@ORGANIZATION/PROJECT-api";
import { IEntity } from "@ORGANIZATION/PROJECT-api/lib/structures/IEntity";
import type { IRedditCloneCommunity } from "@ORGANIZATION/PROJECT-api/lib/structures/IRedditCloneCommunity";
import type { IRedditCloneCommunityIcon } from "@ORGANIZATION/PROJECT-api/lib/structures/IRedditCloneCommunityIcon";
import type { IRedditCloneFile } from "@ORGANIZATION/PROJECT-api/lib/structures/IRedditCloneFile";
import type { IRedditCloneFileThumbnail } from "@ORGANIZATION/PROJECT-api/lib/structures/IRedditCloneFileThumbnail";
import type { IRedditCloneMember } from "@ORGANIZATION/PROJECT-api/lib/structures/IRedditCloneMember";
import { DeepPartial } from "@ORGANIZATION/PROJECT-api/lib/typings/DeepPartial";
import { ArrayUtil, RandomGenerator, TestValidator } from "@nestia/e2e";
import { IConnection } from "@nestia/fetcher";
import { randint } from "tstl";
import typia, { tags } from "typia";

export async function test_api_community_icon_retrieval_not_found(
  connection: api.IConnection,
): Promise<void> {
  // Generate a valid UUID format that doesn't correspond to any existing community
  const nonExistentCommunityId = typia.random<string & tags.Format<"uuid">>();
  // Test that requesting icon for non-existent community returns HTTP 404
  await TestValidator.httpError(
    "community icon not found returns 404",
    404,
    async () =>
      await api.functional.redditClone.communities.icon.at(connection, {
        communityId: nonExistentCommunityId,
      }),
  );
}
