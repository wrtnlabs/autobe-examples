import api from "@ORGANIZATION/PROJECT-api";
import type { IAuthorizationToken } from "@ORGANIZATION/PROJECT-api/lib/structures/IAuthorizationToken";
import type { ICommunityPlatformUser } from "@ORGANIZATION/PROJECT-api/lib/structures/ICommunityPlatformUser";
import type { ICommunityPlatformUserEmailVerification } from "@ORGANIZATION/PROJECT-api/lib/structures/ICommunityPlatformUserEmailVerification";
import { IEntity } from "@ORGANIZATION/PROJECT-api/lib/structures/IEntity";
import type { IPage } from "@ORGANIZATION/PROJECT-api/lib/structures/IPage";
import type { IPageICommunityPlatformUserEmailVerification } from "@ORGANIZATION/PROJECT-api/lib/structures/IPageICommunityPlatformUserEmailVerification";
import { DeepPartial } from "@ORGANIZATION/PROJECT-api/lib/typings/DeepPartial";
import { ArrayUtil, RandomGenerator, TestValidator } from "@nestia/e2e";
import { IConnection } from "@nestia/fetcher";
import { randint } from "tstl";
import typia, { tags } from "typia";

import { authorize_user_join } from "../../../authorize/authorize_user_join";
import { authorize_user_login } from "../../../authorize/authorize_user_login";
import { authorize_user_refresh } from "../../../authorize/authorize_user_refresh";

export async function test_api_user_email_verifications_filter_no_results(
  connection: api.IConnection,
): Promise<void> {
  // 1. User registration and authorization
  const userConnection: api.IConnection = { host: connection.host };
  const authorized = await authorize_user_join(userConnection, {
    body: {
      email: typia.random<string & tags.Format<"email">>(),
      password: "password1234",
      username: RandomGenerator.name(1),
      displayName: RandomGenerator.name(1),
      href: typia.random<string & tags.Format<"uri">>(),
      referrer: typia.random<string & tags.Format<"uri">>(),
      ip: null,
    },
  });
  userConnection.headers = { Authorization: authorized.token.access };
  // 2. Query with non-existent userId filter
  const nonExistentUserId = typia.random<string & tags.Format<"uuid">>();
  const response1 =
    await api.functional.communityPlatform.user.email_verifications.index(
      userConnection,
      {
        body: {
          userId: nonExistentUserId,
          page: 1,
          limit: 10,
        },
      },
    );
  typia.assert(response1);
  TestValidator.predicate(
    "response1 data array is empty",
    response1.data.length === 0,
  );
  TestValidator.equals(
    "response1 pagination current",
    response1.pagination.current,
    1,
  );
  TestValidator.equals(
    "response1 pagination limit",
    response1.pagination.limit,
    10,
  );
  TestValidator.equals(
    "response1 pagination records",
    response1.pagination.records,
    0,
  );
  TestValidator.equals(
    "response1 pagination pages",
    response1.pagination.pages,
    0,
  );
  // 3. Query with non-existent token filter
  const nonExistentToken = RandomGenerator.alphaNumeric(32);
  const response2 =
    await api.functional.communityPlatform.user.email_verifications.index(
      userConnection,
      {
        body: {
          token: nonExistentToken,
          page: 1,
          limit: 10,
        },
      },
    );
  typia.assert(response2);
  TestValidator.predicate(
    "response2 data array is empty",
    response2.data.length === 0,
  );
  TestValidator.equals(
    "response2 pagination current",
    response2.pagination.current,
    1,
  );
  TestValidator.equals(
    "response2 pagination limit",
    response2.pagination.limit,
    10,
  );
  TestValidator.equals(
    "response2 pagination records",
    response2.pagination.records,
    0,
  );
  TestValidator.equals(
    "response2 pagination pages",
    response2.pagination.pages,
    0,
  );
  // 4. Authorization enforcement: call without auth headers
  const anonConnection: api.IConnection = { host: connection.host };
  await TestValidator.httpError(
    "unauthorized access is forbidden",
    401,
    async () => {
      await api.functional.communityPlatform.user.email_verifications.index(
        anonConnection,
        {
          body: {
            page: 1,
            limit: 10,
          },
        },
      );
    },
  );
}
