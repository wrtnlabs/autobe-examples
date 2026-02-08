import api from "@ORGANIZATION/PROJECT-api";
import type { IAuthorizationToken } from "@ORGANIZATION/PROJECT-api/lib/structures/IAuthorizationToken";
import type { ICommunityPlatformComment } from "@ORGANIZATION/PROJECT-api/lib/structures/ICommunityPlatformComment";
import type { ICommunityPlatformUser } from "@ORGANIZATION/PROJECT-api/lib/structures/ICommunityPlatformUser";
import { IEntity } from "@ORGANIZATION/PROJECT-api/lib/structures/IEntity";
import { DeepPartial } from "@ORGANIZATION/PROJECT-api/lib/typings/DeepPartial";
import { ArrayUtil, RandomGenerator, TestValidator } from "@nestia/e2e";
import { IConnection } from "@nestia/fetcher";
import { randint } from "tstl";
import typia, { tags } from "typia";

import { authorize_user_join } from "../../../authorize/authorize_user_join";
import { authorize_user_login } from "../../../authorize/authorize_user_login";
import { authorize_user_refresh } from "../../../authorize/authorize_user_refresh";
import { generate_random_community_platform_user_comments_create } from "../../../generate/generate_random_community_platform_user_comments_create";
import { prepare_random_community_platform_comment } from "../../../prepare/prepare_random_community_platform_comment";

export async function test_api_comment_detail_retrieval_success(
  connection: api.IConnection,
): Promise<void> {
  // Test scenario verifies the success of detailed comment retrieval using comment UUID.
  // 1. Register and authorize user
  const userConnection: api.IConnection = { host: connection.host };
  const authorized = await authorize_user_join(userConnection, { body: {} });
  userConnection.headers = { Authorization: authorized.token.access };
  // 2. Create a comment using generation function
  const comment = await generate_random_community_platform_user_comments_create(
    userConnection,
    { body: {} },
  );
  typia.assert(comment);
  // 3. Extract commentId safely from unknown-object cast
  const commentRaw = comment as unknown as {
    id: string;
  };
  const commentId: string = commentRaw.id;
  // 4. Retrieve the comment details
  const retrieved = await api.functional.communityPlatform.user.comments.at(
    userConnection,
    { commentId },
  );
  typia.assert(retrieved);
  // 5. Verify retrieved comment equals created comment
  TestValidator.equals("retrieved comment", retrieved, comment);
}
