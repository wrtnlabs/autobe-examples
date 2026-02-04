import api from "@ORGANIZATION/PROJECT-api";
import type { IAuthorizationToken } from "@ORGANIZATION/PROJECT-api/lib/structures/IAuthorizationToken";
import type { ICommunityPlatformUser } from "@ORGANIZATION/PROJECT-api/lib/structures/ICommunityPlatformUser";
import { IEntity } from "@ORGANIZATION/PROJECT-api/lib/structures/IEntity";
import type { IPage } from "@ORGANIZATION/PROJECT-api/lib/structures/IPage";
import type { IPageICommunityPlatformUser } from "@ORGANIZATION/PROJECT-api/lib/structures/IPageICommunityPlatformUser";
import { DeepPartial } from "@ORGANIZATION/PROJECT-api/lib/typings/DeepPartial";
import { ArrayUtil, RandomGenerator, TestValidator } from "@nestia/e2e";
import { IConnection } from "@nestia/fetcher";
import { randint } from "tstl";
import typia, { tags } from "typia";

import { authorize_user_join } from "../../../authorize/authorize_user_join";
import { authorize_user_login } from "../../../authorize/authorize_user_login";
import { authorize_user_refresh } from "../../../authorize/authorize_user_refresh";

export async function test_api_user_list_with_karma_sort(
  connection: api.IConnection,
): Promise<void> {
  // Create users
  const user1 = await authorize_user_join(connection, {
    body: {
      email: typia.random<string & tags.Format<"email">>() + "@example.com",
      password: typia.random<
        string &
          tags.MinLength<8> &
          tags.Pattern<"^(?=.*[A-Z])(?=.*[a-z])(?=.*\\d)(?=.*[!@#$%^&*]).{8,}$">
      >(),
      display_name: RandomGenerator.name(3),
    },
  });
  const user2 = await authorize_user_join(connection, {
    body: {
      email: typia.random<string & tags.Format<"email">>() + "@example.com",
      password: typia.random<
        string &
          tags.MinLength<8> &
          tags.Pattern<"^(?=.*[A-Z])(?=.*[a-z])(?=.*\\d)(?=.*[!@#$%^&*]).{8,}$">
      >(),
      display_name: RandomGenerator.name(3),
    },
  });
  // Retrieve user list sorted by karma
  const userPage = await api.functional.communityPlatform.users.index(
    connection,
    {
      body: {
        sort: "karma",
        limit: 2,
      },
    },
  );
  // Verify the list is sorted from highest to lowest by karma
  const users = userPage.data;
  for (let i = 0; i < users.length - 1; i++) {
    TestValidator.predicate(
      "karma scores should be in descending order",
      users[i].karma_score >= users[i + 1].karma_score,
    );
  }
}
