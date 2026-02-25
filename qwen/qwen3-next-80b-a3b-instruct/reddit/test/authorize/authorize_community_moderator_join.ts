import api from "@ORGANIZATION/PROJECT-api";
import type { IAuthorizationToken } from "@ORGANIZATION/PROJECT-api/lib/structures/IAuthorizationToken";
import { IEntity } from "@ORGANIZATION/PROJECT-api/lib/structures/IEntity";
import type { IRedditCommunityCommunity } from "@ORGANIZATION/PROJECT-api/lib/structures/IRedditCommunityCommunity";
import type { IRedditCommunityCommunityModerator } from "@ORGANIZATION/PROJECT-api/lib/structures/IRedditCommunityCommunityModerator";
import type { IRedditCommunityMember } from "@ORGANIZATION/PROJECT-api/lib/structures/IRedditCommunityMember";
import { DeepPartial } from "@ORGANIZATION/PROJECT-api/lib/typings/DeepPartial";
import { ArrayUtil, RandomGenerator, TestValidator } from "@nestia/e2e";
import { IConnection } from "@nestia/fetcher";
import { randint } from "tstl";
import typia, { tags } from "typia";

export async function authorize_community_moderator_join(
  connection: api.IConnection,
  props: {
    body?: IRedditCommunityCommunityModerator.IJoin;
  },
): Promise<IRedditCommunityCommunityModerator.IAuthorized> {
  const joinInput = {
    email: props.body?.email ?? typia.random<string & tags.Format<"email">>(),
    password:
      props.body?.password ??
      (() => {
        let password = RandomGenerator.alphaNumeric(16);
        // Ensure contains at least one digit
        if (!/[0-9]/.test(password)) password = password.replace(/D/, "1");
        // Ensure contains at least one special character
        if (!/[!@#$%^&*]/.test(password))
          password = password.replace(/[^0-9a-zA-Z]/, "!");
        return password;
      })(),
    username: props.body?.username ?? RandomGenerator.name(1),
  } satisfies IRedditCommunityCommunityModerator.IJoin;
  return await api.functional.redditCommunity.auth.communityModerator.join(
    connection,
    {
      body: joinInput,
    },
  );
}
