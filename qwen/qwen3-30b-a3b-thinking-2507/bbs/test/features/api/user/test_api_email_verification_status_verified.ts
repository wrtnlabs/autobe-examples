import api from "@ORGANIZATION/PROJECT-api";
import type { IAuthorizationToken } from "@ORGANIZATION/PROJECT-api/lib/structures/IAuthorizationToken";
import type { IEconomicPoliticalDiscussionBoardUser } from "@ORGANIZATION/PROJECT-api/lib/structures/IEconomicPoliticalDiscussionBoardUser";
import type { IEconomicPoliticalDiscussionBoardUserEmailVerification } from "@ORGANIZATION/PROJECT-api/lib/structures/IEconomicPoliticalDiscussionBoardUserEmailVerification";
import { IEntity } from "@ORGANIZATION/PROJECT-api/lib/structures/IEntity";
import { DeepPartial } from "@ORGANIZATION/PROJECT-api/lib/typings/DeepPartial";
import { ArrayUtil, RandomGenerator, TestValidator } from "@nestia/e2e";
import { IConnection } from "@nestia/fetcher";
import { randint } from "tstl";
import typia, { tags } from "typia";

import { authorize_user_join } from "../../../authorize/authorize_user_join";
import { authorize_user_login } from "../../../authorize/authorize_user_login";
import { authorize_user_refresh } from "../../../authorize/authorize_user_refresh";

export async function test_api_email_verification_status_verified(
  connection: api.IConnection,
): Promise<void> {
  const userConnection: api.IConnection = { host: connection.host };
  const auth: IEconomicPoliticalDiscussionBoardUser.IAuthorized =
    await authorize_user_join(userConnection, {
      body: {
        email: typia.random<string & tags.Format<"email">>(),
        password: RandomGenerator.alphaNumeric(16),
        href: `https://test.example.com/signup`,
        referrer: `https://test.example.com/register`,
        ip: typia.random<string & tags.Format<"ipv4">>(),
      } satisfies IEconomicPoliticalDiscussionBoardUser.IJoin,
    });
  const verification =
    await api.functional.economicPoliticalDiscussionBoard.user.email_verifications.at(
      userConnection,
      {
        verificationId: auth.user.id,
      },
    );
  typia.assert(verification);
  TestValidator.predicate(
    "verification status should be true",
    verification.verified === true,
  );
  TestValidator.equals("user ID matches", verification.user_id, auth.user.id);
}
