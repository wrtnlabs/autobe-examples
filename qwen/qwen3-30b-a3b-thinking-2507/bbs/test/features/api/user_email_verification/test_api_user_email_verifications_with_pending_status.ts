import api from "@ORGANIZATION/PROJECT-api";
import type { IAuthorizationToken } from "@ORGANIZATION/PROJECT-api/lib/structures/IAuthorizationToken";
import type { IEconomicPoliticalDiscussionBoardUser } from "@ORGANIZATION/PROJECT-api/lib/structures/IEconomicPoliticalDiscussionBoardUser";
import type { IEconomicPoliticalDiscussionBoardUserEmailVerification } from "@ORGANIZATION/PROJECT-api/lib/structures/IEconomicPoliticalDiscussionBoardUserEmailVerification";
import { IEntity } from "@ORGANIZATION/PROJECT-api/lib/structures/IEntity";
import type { IPage } from "@ORGANIZATION/PROJECT-api/lib/structures/IPage";
import type { IPageIEconomicPoliticalDiscussionBoardUserEmailVerification } from "@ORGANIZATION/PROJECT-api/lib/structures/IPageIEconomicPoliticalDiscussionBoardUserEmailVerification";
import { DeepPartial } from "@ORGANIZATION/PROJECT-api/lib/typings/DeepPartial";
import { ArrayUtil, RandomGenerator, TestValidator } from "@nestia/e2e";
import { IConnection } from "@nestia/fetcher";
import { randint } from "tstl";
import typia, { tags } from "typia";

import { authorize_user_join } from "../../../authorize/authorize_user_join";
import { authorize_user_login } from "../../../authorize/authorize_user_login";
import { authorize_user_refresh } from "../../../authorize/authorize_user_refresh";

export async function test_api_user_email_verifications_with_pending_status(
  connection: api.IConnection,
): Promise<void> {
  // 1. Create user to generate pending email verification token
  const userConnection: api.IConnection = { host: connection.host };
  const newUser = await authorize_user_join(userConnection, {
    body: {
      email: typia.random<string & tags.Format<"email">>(),
      password: RandomGenerator.alphaNumeric(16),
      href: "https://example.com/signup",
      referrer: "https://example.com",
      ip: `${Math.floor(Math.random() * 256)}.${Math.floor(Math.random() * 256)}.${Math.floor(Math.random() * 256)}.${Math.floor(Math.random() * 256)}`,
    } satisfies IEconomicPoliticalDiscussionBoardUser.IJoin,
  });
  // 2. Verify that we get only 'pending' status when filtering
  const response =
    await api.functional.economicPoliticalDiscussionBoard.user.email_verifications.index(
      connection,
      {
        body: {
          status: "pending",
          page: 1,
          limit: 10,
        } satisfies IEconomicPoliticalDiscussionBoardUserEmailVerification.IRequest,
      },
    );
  typia.assert(response);
  // 3. Check that the response has at least one item with status 'pending'
  TestValidator.predicate(
    "response should have items",
    response.data.length > 0,
  );
  // 4. Verify status of each token in the response
  for (const verification of response.data) {
    TestValidator.equals(
      "verification status should be 'pending'",
      verification.verified,
      false,
    );
  }
}
