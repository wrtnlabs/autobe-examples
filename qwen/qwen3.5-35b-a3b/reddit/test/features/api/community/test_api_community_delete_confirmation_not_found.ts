import api from "@ORGANIZATION/PROJECT-api";
import type { IAuthorizationToken } from "@ORGANIZATION/PROJECT-api/lib/structures/IAuthorizationToken";
import { IEntity } from "@ORGANIZATION/PROJECT-api/lib/structures/IEntity";
import type { IRedditCommunityCommunity } from "@ORGANIZATION/PROJECT-api/lib/structures/IRedditCommunityCommunity";
import type { IRedditCommunityMember } from "@ORGANIZATION/PROJECT-api/lib/structures/IRedditCommunityMember";
import { DeepPartial } from "@ORGANIZATION/PROJECT-api/lib/typings/DeepPartial";
import { ArrayUtil, RandomGenerator, TestValidator } from "@nestia/e2e";
import { IConnection } from "@nestia/fetcher";
import { randint } from "tstl";
import typia, { tags } from "typia";

import { authorize_member_join } from "../../../authorize/authorize_member_join";
import { authorize_member_login } from "../../../authorize/authorize_member_login";
import { authorize_member_refresh } from "../../../authorize/authorize_member_refresh";

export async function test_api_community_delete_confirmation_not_found(
  connection: api.IConnection,
): Promise<void> {
  // 1. Register and authenticate new member
  const memberConnection: api.IConnection = { host: connection.host };
  const memberAuthorized = await authorize_member_join(memberConnection, {
    body: {
      email: typia.random<string & tags.Format<"email">>(),
      password: "1234",
      username: RandomGenerator.name(),
      href: "https://example.com/join",
      referrer: "https://example.com/",
    },
  });
  typia.assert(memberAuthorized);
  // 2. Create authenticated connection using member token
  const authenticatedConnection: api.IConnection = {
    host: connection.host,
    headers: { Authorization: memberAuthorized.token.access },
  };
  // 3. Generate invalid community UUID that does not exist
  const invalidCommunityId = typia.random<string & tags.Format<"uuid">>();
  // 4. Test that attempting to initiate deletion for non-existent community returns 404
  await TestValidator.error(
    "delete confirmation returns 404 for non-existent community",
    async () => {
      await api.functional.redditCommunity.member.communities.delete_confirmation.deleteConfirmation(
        authenticatedConnection,
        {
          communityId: invalidCommunityId,
        },
      );
    },
  );
}
