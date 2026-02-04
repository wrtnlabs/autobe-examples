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

export async function test_api_citizen_login_successful(
  connection: api.IConnection,
): Promise<void> {
  // Step 1: Create a citizen account for login testing using utility function
  const joinInput: IEconomicDiscussionCitizen.IJoin = {
    email: typia.random<string & tags.Format<"email">>(),
    password: RandomGenerator.alphaNumeric(16),
    href: `https://${RandomGenerator.alphaNumeric(12)}.io`,
    referrer: `https://${RandomGenerator.alphaNumeric(12)}.com`,
  } satisfies IEconomicDiscussionCitizen.IJoin;
  // Use the utility function as mandated by priority rules
  const citizen: IEconomicDiscussionCitizen.IAuthorized =
    await authorize_citizen_join(connection, { body: joinInput });
  typia.assert(citizen);
  // Step 2: Create a new connection for the login attempt (connection isolation pattern)
  const loginConnection: api.IConnection = { host: connection.host };
  // Step 3: Login with the created citizen's credentials using utility function
  const loginInput: IEconomicDiscussionCitizen.ILogin = {
    email: joinInput.email,
    password: joinInput.password,
  } satisfies IEconomicDiscussionCitizen.ILogin;
  // Use the utility function as mandated by priority rules
  const loginOutput: IEconomicDiscussionCitizen.IAuthorized =
    await authorize_citizen_login(loginConnection, { body: loginInput });
  typia.assert(loginOutput);
  // Step 4: Validate successful login output according to business logic
  // The utility functions handle authentication properly, so we validate the business outcome
  TestValidator.predicate(
    "display_name exists and is not empty",
    loginOutput.display_name.length > 0,
  );
  TestValidator.predicate(
    "bio is valid string",
    typeof loginOutput.bio === "string",
  );
  TestValidator.predicate(
    "id is a valid uuid",
    /^[0-9a-f]{8}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{12}$/i.test(
      loginOutput.id,
    ),
  );
  // Validate token structure and expiration
  TestValidator.predicate(
    "access token exists",
    loginOutput.token.access.length > 0,
  );
  TestValidator.predicate(
    "refresh token exists",
    loginOutput.token.refresh.length > 0,
  );
  TestValidator.predicate(
    "expired_at is valid date-time format",
    /^[0-9]{4}-[0-9]{2}-[0-9]{2}T[0-9]{2}:[0-9]{2}:[0-9]{2}\.\d{3}Z$/.test(
      loginOutput.token.expired_at,
    ),
  );
  TestValidator.predicate(
    "refreshable_until is valid date-time format",
    /^[0-9]{4}-[0-9]{2}-[0-9]{2}T[0-9]{2}:[0-9]{2}:[0-9]{2}\.\d{3}Z$/.test(
      loginOutput.token.refreshable_until,
    ),
  );
  // Validate that articles and comments are arrays
  TestValidator.predicate(
    "articles is an array",
    Array.isArray(loginOutput.articles),
  );
  TestValidator.predicate(
    "comments is an array",
    Array.isArray(loginOutput.comments),
  );
  // Verify email matches
  TestValidator.equals(
    "login email matches",
    loginOutput.email,
    joinInput.email,
  );
}
