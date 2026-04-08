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

export async function test_api_community_retrieval_with_icon_and_owner(
  connection: api.IConnection,
): Promise<void> {
  // Generate a random community UUID to retrieve
  const communityId = typia.random<string & tags.Format<"uuid">>();
  // Retrieve community details with icon and owner information
  const community = await api.functional.redditClone.communities.at(
    connection,
    {
      communityId,
    },
  );
  typia.assert(community);
  // Validate icon relationship exists for active community
  TestValidator.predicate(
    "icon relationship is present",
    community.icon !== null && community.icon !== undefined,
  );
  // Validate icon file metadata is present
  TestValidator.predicate(
    "icon file metadata is present",
    community.icon.file !== null && community.icon.file !== undefined,
  );
  // Validate owner relationship exists
  TestValidator.predicate(
    "owner relationship is present",
    community.owner !== null && community.owner !== undefined,
  );
  // Validate active community has null deletedAt
  TestValidator.equals(
    "active community has null deletedAt",
    community.deletedAt,
    null,
  );
  // Validate icon's parent community matches retrieved community
  TestValidator.equals(
    "icon community matches parent community id",
    community.icon.community.id,
    community.id,
  );
}
