import api from "@ORGANIZATION/PROJECT-api";
import type { IAuthorizationToken } from "@ORGANIZATION/PROJECT-api/lib/structures/IAuthorizationToken";
import { IEntity } from "@ORGANIZATION/PROJECT-api/lib/structures/IEntity";
import type { IPage } from "@ORGANIZATION/PROJECT-api/lib/structures/IPage";
import type { IPageIRedditCommunityBan } from "@ORGANIZATION/PROJECT-api/lib/structures/IPageIRedditCommunityBan";
import type { IRedditCommunityBan } from "@ORGANIZATION/PROJECT-api/lib/structures/IRedditCommunityBan";
import type { IRedditCommunityCommunity } from "@ORGANIZATION/PROJECT-api/lib/structures/IRedditCommunityCommunity";
import type { IRedditCommunityMember } from "@ORGANIZATION/PROJECT-api/lib/structures/IRedditCommunityMember";
import type { IRedditCommunityModerator } from "@ORGANIZATION/PROJECT-api/lib/structures/IRedditCommunityModerator";
import type { IRedditCommunityUserProfile } from "@ORGANIZATION/PROJECT-api/lib/structures/IRedditCommunityUserProfile";
import { DeepPartial } from "@ORGANIZATION/PROJECT-api/lib/typings/DeepPartial";
import { ArrayUtil, RandomGenerator, TestValidator } from "@nestia/e2e";
import { IConnection } from "@nestia/fetcher";
import { randint } from "tstl";
import typia, { tags } from "typia";

import { authorize_member_join } from "../../../authorize/authorize_member_join";
import { authorize_member_login } from "../../../authorize/authorize_member_login";
import { authorize_member_refresh } from "../../../authorize/authorize_member_refresh";

export async function test_api_ban_list_denied_non_moderator(
  connection: api.IConnection,
): Promise<void> {
  // 1. Create a new member (non-moderator)
  const memberConnection: api.IConnection = { host: connection.host };
  const memberAuth: IRedditCommunityMember.IAuthorized =
    await authorize_member_join(memberConnection, {
      body: {
        email: typia.random<string & tags.Format<"email">>(),
        password: RandomGenerator.alphaNumeric(16),
        href: typia.random<string & tags.Format<"uri">>(),
        referrer: typia.random<string & tags.Format<"uri">>(),
        ip: typia.random<string & tags.Format<"ipv4">>(),
      } satisfies IRedditCommunityMember.IJoin,
    });
  typia.assert(memberAuth);
  // 2. Create connection for non-moderator member
  const nonModeratorConnection: api.IConnection = { host: connection.host };
  nonModeratorConnection.headers = {
    Authorization: memberAuth.token.access,
  };
  // 3. Test with a random community UUID
  const testCommunityId: string & tags.Format<"uuid"> = typia.random<
    string & tags.Format<"uuid">
  >();
  // 4. Attempt to access ban list - should be denied (403 Forbidden or 404 Not Found)
  // The key validation is that the non-moderator cannot access this endpoint
  await TestValidator.httpError(
    "non-moderator should be denied access to ban list",
    [403, 404],
    async () => {
      await api.functional.redditCommunity.communities.bans.index(
        nonModeratorConnection,
        {
          communityId: testCommunityId,
          body: {} satisfies IRedditCommunityBan.IRequest,
        },
      );
    },
  );
  // 5. Verify the error message indicates lack of moderator authority
  try {
    await api.functional.redditCommunity.communities.bans.index(
      nonModeratorConnection,
      {
        communityId: testCommunityId,
        body: {} satisfies IRedditCommunityBan.IRequest,
      },
    );
    throw new Error("Expected HttpError but none was thrown");
  } catch (error) {
    if (typia.is<api.HttpError>(error)) {
      TestValidator.predicate(
        "error message should indicate unauthorized",
        () =>
          error.message.includes("moderator") ||
          error.message.includes("unauthorized") ||
          error.message.includes("403") ||
          error.message.includes("404"),
      );
    }
  }
}