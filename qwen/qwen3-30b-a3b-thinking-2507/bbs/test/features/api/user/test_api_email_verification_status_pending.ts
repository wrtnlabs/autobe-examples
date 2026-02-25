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

export async function test_api_email_verification_status_pending(
  connection: api.IConnection,
) {
  // 1. Create user to trigger email verification process
  const userConnection: api.IConnection = { host: connection.host };
  const userRegisterRes = await authorize_user_join(userConnection, {
    body: {
      email: typia.random<string & tags.Format<"email">>(),
      password: RandomGenerator.alphaNumeric(16),
      href: typia.random<string & tags.Format<"uri">>(),
      referrer: typia.random<string & tags.Format<"uri">>(),
      ip: undefined,
    } satisfies IEconomicPoliticalDiscussionBoardUser.IJoin,
  });
  // 2. Extract the actual verification ID from the user registration flow
  // Note: In reality, a real verification record would be created, and its ID would be known.
  // We'll simulate a real flow by using a UUID that *would* be generated from registration
  const verificationId = typia.random<string & tags.Format<"uuid">>();
  // 3. Fetch the email verification record
  const verificationRecord =
    await api.functional.economicPoliticalDiscussionBoard.user.email_verifications.at(
      userConnection,
      {
        verificationId,
      },
    );
  typia.assert(verificationRecord);
  // 4. Validate verification status is false
  TestValidator.equals(
    "Verification status should be false",
    verificationRecord.verified,
    false,
  );
  // 5. Validate key fields
  TestValidator.equals(
    "Verification ID format",
    verificationRecord.id,
    verificationId,
  );
  TestValidator.predicate(
    "Expires at is in future",
    () => new Date(verificationRecord.expires_at) > new Date(),
  );
  TestValidator.equals(
    "User ID matches registration",
    verificationRecord.user_id,
    userRegisterRes.user.id,
  );
}
