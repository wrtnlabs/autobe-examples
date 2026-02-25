import api from "@ORGANIZATION/PROJECT-api";
import type { IAuthorizationToken } from "@ORGANIZATION/PROJECT-api/lib/structures/IAuthorizationToken";
import { IEntity } from "@ORGANIZATION/PROJECT-api/lib/structures/IEntity";
import type { IRedditCommunityCommunityOwner } from "@ORGANIZATION/PROJECT-api/lib/structures/IRedditCommunityCommunityOwner";
import { DeepPartial } from "@ORGANIZATION/PROJECT-api/lib/typings/DeepPartial";
import { ArrayUtil, RandomGenerator, TestValidator } from "@nestia/e2e";
import { IConnection } from "@nestia/fetcher";
import { randint } from "tstl";
import typia, { tags } from "typia";

export async function authorize_community_owner_refresh(
  connection: api.IConnection,
  props: {
    body: IRedditCommunityCommunityOwner.IRefresh;
  },
): Promise<IRedditCommunityCommunityOwner.IAuthorized> {
  return await api.functional.redditCommunity.auth.community_owner.refresh(
    connection,
    {
      body: props.body,
    },
  );
}
