import api from "@ORGANIZATION/PROJECT-api";
import type { IAuthorizationToken } from "@ORGANIZATION/PROJECT-api/lib/structures/IAuthorizationToken";
import { IEntity } from "@ORGANIZATION/PROJECT-api/lib/structures/IEntity";
import type { IRedditCommunityCommunity } from "@ORGANIZATION/PROJECT-api/lib/structures/IRedditCommunityCommunity";
import type { IRedditCommunityMember } from "@ORGANIZATION/PROJECT-api/lib/structures/IRedditCommunityMember";
import type { IRedditCommunityPost } from "@ORGANIZATION/PROJECT-api/lib/structures/IRedditCommunityPost";
import { DeepPartial } from "@ORGANIZATION/PROJECT-api/lib/typings/DeepPartial";
import { ArrayUtil, RandomGenerator, TestValidator } from "@nestia/e2e";
import { IConnection } from "@nestia/fetcher";
import { randint } from "tstl";
import typia, { tags } from "typia";

import { authorize_member_join } from "../../../authorize/authorize_member_join";
import { authorize_member_login } from "../../../authorize/authorize_member_login";
import { authorize_member_refresh } from "../../../authorize/authorize_member_refresh";

export async function test_api_post_details_not_found(
  connection: api.IConnection,
): Promise<void> {
  // 1. Authenticate member with randomized credentials
  const memberConnection: api.IConnection = { host: connection.host };
  const authResponse = await authorize_member_join(memberConnection, {
    body: {
      email: typia.random<string & tags.Format<"email">>(),
      password: RandomGenerator.alphaNumeric(16),
      username: RandomGenerator.name(1),
      href: typia.random<string & tags.Format<"uri">>(),
      referrer: typia.random<string & tags.Format<"uri">>(),
    } satisfies IRedditCommunityMember.IJoin,
  });
  typia.assert(authResponse);
  // 2. Create new connection with auth token for post retrieval
  const authenticatedConnection: api.IConnection = { host: connection.host };
  authenticatedConnection.headers = {
    Authorization: authResponse.token.access,
  };
  // 3. Generate a non-existent UUID for testing
  const nonExistentPostId: string & tags.Format<"uuid"> = typia.random<
    string & tags.Format<"uuid">
  >();
  // 4. Attempt to retrieve non-existent post details
  let response: IRedditCommunityPost | null =
    await api.functional.redditCommunity.member.posts.details.at(
      authenticatedConnection,
      {
        postId: nonExistentPostId,
      },
    );
  typia.assert(response);
  // 5. Validate response is null (graceful handling of missing post)
  TestValidator.equals(
    "post details null for non-existent post",
    response,
    null,
  );
}
