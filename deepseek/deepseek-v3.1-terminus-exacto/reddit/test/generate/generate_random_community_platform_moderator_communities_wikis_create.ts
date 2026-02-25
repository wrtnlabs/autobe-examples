import api from "@ORGANIZATION/PROJECT-api";
import type { ICommunityPlatformCommunity } from "@ORGANIZATION/PROJECT-api/lib/structures/ICommunityPlatformCommunity";
import type { ICommunityPlatformCommunityWiki } from "@ORGANIZATION/PROJECT-api/lib/structures/ICommunityPlatformCommunityWiki";
import type { ICommunityPlatformUser } from "@ORGANIZATION/PROJECT-api/lib/structures/ICommunityPlatformUser";
import { IEntity } from "@ORGANIZATION/PROJECT-api/lib/structures/IEntity";
import { DeepPartial } from "@ORGANIZATION/PROJECT-api/lib/typings/DeepPartial";
import { ArrayUtil, RandomGenerator, TestValidator } from "@nestia/e2e";
import { IConnection } from "@nestia/fetcher";
import { randint } from "tstl";
import typia, { tags } from "typia";

import { prepare_random_community_platform_community_wiki } from "../prepare/prepare_random_community_platform_community_wiki";

export async function generate_random_community_platform_moderator_communities_wikis_create(
  connection: api.IConnection,
  props: {
    body?: DeepPartial<ICommunityPlatformCommunityWiki.ICreate>;
    params: {
      communityId: string;
    };
  },
): Promise<ICommunityPlatformCommunityWiki> {
  const prepared: ICommunityPlatformCommunityWiki.ICreate =
    prepare_random_community_platform_community_wiki(props.body);
  const result: ICommunityPlatformCommunityWiki =
    await api.functional.communityPlatform.moderator.communities.wikis.create(
      connection,
      {
        communityId: props.params.communityId,
        body: prepared,
      },
    );
  return result;
}
