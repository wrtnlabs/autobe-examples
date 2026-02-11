import api from "@ORGANIZATION/PROJECT-api";
import type { IAuthorizationToken } from "@ORGANIZATION/PROJECT-api/lib/structures/IAuthorizationToken";
import { IEntity } from "@ORGANIZATION/PROJECT-api/lib/structures/IEntity";
import type { IRedditCommunityCommunityModerator } from "@ORGANIZATION/PROJECT-api/lib/structures/IRedditCommunityCommunityModerator";
import { DeepPartial } from "@ORGANIZATION/PROJECT-api/lib/typings/DeepPartial";
import { ArrayUtil, RandomGenerator, TestValidator } from "@nestia/e2e";
import { IConnection } from "@nestia/fetcher";
import { randint } from "tstl";
import typia, { tags } from "typia";

export async function authorize_community_moderator_join(
  connection: api.IConnection,
  props: {
    body?: DeepPartial<IRedditCommunityCommunityModerator.IJoin>;
  },
): Promise<IRedditCommunityCommunityModerator.IAuthorized> {
  const joinInput = {
    email: props.body?.email ?? typia.random<string & tags.Format<"email">>(),
    password_hash:
      props.body?.password_hash ?? RandomGenerator.alphaNumeric(16),
    display_name: props.body?.display_name ?? RandomGenerator.name(),
  } satisfies IRedditCommunityCommunityModerator.IJoin;
  return await api.functional.redditCommunity.auth.communityModerator.join(
    connection,
    { body: joinInput },
  );
}
