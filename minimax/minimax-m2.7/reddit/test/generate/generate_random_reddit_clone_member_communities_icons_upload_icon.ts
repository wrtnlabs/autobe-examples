import api from "@ORGANIZATION/PROJECT-api";
import { IEntity } from "@ORGANIZATION/PROJECT-api/lib/structures/IEntity";
import type { IRedditCloneCommunityBan } from "@ORGANIZATION/PROJECT-api/lib/structures/IRedditCloneCommunityBan";
import type { IRedditCloneCommunityIcon } from "@ORGANIZATION/PROJECT-api/lib/structures/IRedditCloneCommunityIcon";
import type { IRedditCloneFile } from "@ORGANIZATION/PROJECT-api/lib/structures/IRedditCloneFile";
import type { IRedditCloneFileAssociation } from "@ORGANIZATION/PROJECT-api/lib/structures/IRedditCloneFileAssociation";
import type { IRedditCloneMemberSession } from "@ORGANIZATION/PROJECT-api/lib/structures/IRedditCloneMemberSession";
import type { IRedditCloneUserProfile } from "@ORGANIZATION/PROJECT-api/lib/structures/IRedditCloneUserProfile";
import { DeepPartial } from "@ORGANIZATION/PROJECT-api/lib/typings/DeepPartial";
import { ArrayUtil, RandomGenerator, TestValidator } from "@nestia/e2e";
import { IConnection } from "@nestia/fetcher";
import { randint } from "tstl";
import typia, { tags } from "typia";

import { prepare_random_reddit_clone_community_icon } from "../prepare/prepare_random_reddit_clone_community_icon";

export async function generate_random_reddit_clone_member_communities_icons_upload_icon(
  connection: api.IConnection,
  props: {
    body?: DeepPartial<IRedditCloneCommunityIcon.ICreate>;
    params: {
      communityName: string;
    };
  }
): Promise<IRedditCloneCommunityIcon> {
  const prepared: IRedditCloneCommunityIcon.ICreate = prepare_random_reddit_clone_community_icon(
    props.body
  );
  const result: IRedditCloneCommunityIcon = await api.functional.redditClone.member.communities.icons.uploadIcon(
    connection,
    {
      communityName: props.params.communityName,
      body: prepared,
    }
  );
  return result;
}