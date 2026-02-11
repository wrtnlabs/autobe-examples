import api from "@ORGANIZATION/PROJECT-api";
import type { IAuthorizationToken } from "@ORGANIZATION/PROJECT-api/lib/structures/IAuthorizationToken";
import { IEntity } from "@ORGANIZATION/PROJECT-api/lib/structures/IEntity";
import type { IRedditCommunityCommunityOwner } from "@ORGANIZATION/PROJECT-api/lib/structures/IRedditCommunityCommunityOwner";
import { DeepPartial } from "@ORGANIZATION/PROJECT-api/lib/typings/DeepPartial";
import { ArrayUtil, RandomGenerator, TestValidator } from "@nestia/e2e";
import { IConnection } from "@nestia/fetcher";
import { randint } from "tstl";
import typia, { tags } from "typia";

export async function authorize_community_owner_join(
  connection: api.IConnection,
  props: {
    body: IRedditCommunityCommunityOwner.IJoin;
  },
): Promise<IRedditCommunityCommunityOwner.IAuthorized> {
  const joinInput = {
    email: props.body.email ?? typia.random<string & tags.Format<"email">>(),
    password: props.body.password ?? RandomGenerator.alphaNumeric(16),
    display_name: props.body.display_name ?? props.body.email?.split("@")[0],
  } satisfies IRedditCommunityCommunityOwner.IJoin;
  return await api.functional.redditCommunity.auth.communityOwner.join(
    connection,
    {
      body: joinInput,
    },
  );
}
