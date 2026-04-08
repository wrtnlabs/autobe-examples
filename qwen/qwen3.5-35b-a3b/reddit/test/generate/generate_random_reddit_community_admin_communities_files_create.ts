import api from "@ORGANIZATION/PROJECT-api";
import { IEntity } from "@ORGANIZATION/PROJECT-api/lib/structures/IEntity";
import type { IRedditCommunityCommunity } from "@ORGANIZATION/PROJECT-api/lib/structures/IRedditCommunityCommunity";
import type { IRedditCommunityCommunityFile } from "@ORGANIZATION/PROJECT-api/lib/structures/IRedditCommunityCommunityFile";
import { DeepPartial } from "@ORGANIZATION/PROJECT-api/lib/typings/DeepPartial";
import { ArrayUtil, RandomGenerator, TestValidator } from "@nestia/e2e";
import { IConnection } from "@nestia/fetcher";
import { randint } from "tstl";
import typia, { tags } from "typia";

import { prepare_random_reddit_community_community_file } from "../prepare/prepare_random_reddit_community_community_file";

/**
 * Generate a random community file for E2E testing.
 *
 * Creates a file record attached to the specified community by calling the
 * file creation API. Generates random file metadata using the prepare function
 * including storage path, filename, MIME type, and file size.
 *
 * Requires a valid community UUID to associate the file with a specific community.
 * The community must exist and not be soft-deleted for successful creation.
 */
export async function generate_random_reddit_community_admin_communities_files_create(
  connection: api.IConnection,
  props: {
    body?: DeepPartial<IRedditCommunityCommunityFile.ICreate> | undefined;
    params: {
      communityId: string;
    };
  },
): Promise<IRedditCommunityCommunityFile> {
  const prepared: IRedditCommunityCommunityFile.ICreate =
    prepare_random_reddit_community_community_file(props.body);
  const result: IRedditCommunityCommunityFile =
    await api.functional.redditCommunity.admin.communities.files.create(
      connection,
      {
        communityId: props.params.communityId,
        body: prepared,
      },
    );
  return result;
}
