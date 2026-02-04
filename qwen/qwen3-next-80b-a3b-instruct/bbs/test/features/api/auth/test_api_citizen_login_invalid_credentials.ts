import api from "@ORGANIZATION/PROJECT-api";
import type { IAuthorizationToken } from "@ORGANIZATION/PROJECT-api/lib/structures/IAuthorizationToken";
import type { IEconomicDiscussionArticle } from "@ORGANIZATION/PROJECT-api/lib/structures/IEconomicDiscussionArticle";
import type { IEconomicDiscussionArticleTag } from "@ORGANIZATION/PROJECT-api/lib/structures/IEconomicDiscussionArticleTag";
import type { IEconomicDiscussionCitizen } from "@ORGANIZATION/PROJECT-api/lib/structures/IEconomicDiscussionCitizen";
import type { IEconomicDiscussionComment } from "@ORGANIZATION/PROJECT-api/lib/structures/IEconomicDiscussionComment";
import { IEntity } from "@ORGANIZATION/PROJECT-api/lib/structures/IEntity";
import { DeepPartial } from "@ORGANIZATION/PROJECT-api/lib/typings/DeepPartial";
import { ArrayUtil, RandomGenerator, TestValidator } from "@nestia/e2e";
import { IConnection } from "@nestia/fetcher";
import { randint } from "tstl";
import typia, { tags } from "typia";

import { authorize_citizen_join } from "../../../authorize/authorize_citizen_join";
import { authorize_citizen_login } from "../../../authorize/authorize_citizen_login";
import { authorize_citizen_refresh } from "../../../authorize/authorize_citizen_refresh";

export async function test_api_citizen_login_invalid_credentials(
  connection: api.IConnection,
): Promise<void> {
  // Step 1: Create a valid citizen account with known credentials using authorize_citizen_join
  const validEmail = typia.random<string & tags.Format<"email">>();
  const validPassword = RandomGenerator.alphaNumeric(16);
  const joinConnection: api.IConnection = { host: connection.host };
  const joinedUser = await authorize_citizen_join(joinConnection, {
    body: {
      email: validEmail,
      password: validPassword,
      href: "https://example.com/join",
      referrer: "https://example.com/home",
    },
  });
  typia.assert(joinedUser);
  // Step 2: Attempt login with correct email but invalid password
  const invalidConnection: api.IConnection = { host: connection.host };
  await TestValidator.error(
    "login should fail with invalid password",
    async () => {
      await authorize_citizen_login(invalidConnection, {
        body: {
          email: validEmail, // Correct email
          password: "wrongpassword123", // Invalid password
        },
      });
    },
  );
}
