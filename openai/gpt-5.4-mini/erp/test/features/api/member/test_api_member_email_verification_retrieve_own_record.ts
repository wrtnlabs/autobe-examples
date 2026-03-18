import api from "@ORGANIZATION/PROJECT-api";
import type { IAuthorizationToken } from "@ORGANIZATION/PROJECT-api/lib/structures/IAuthorizationToken";
import { IEntity } from "@ORGANIZATION/PROJECT-api/lib/structures/IEntity";
import type { IHrmTimeTrackingMember } from "@ORGANIZATION/PROJECT-api/lib/structures/IHrmTimeTrackingMember";
import type { IHrmTimeTrackingMemberEmailVerification } from "@ORGANIZATION/PROJECT-api/lib/structures/IHrmTimeTrackingMemberEmailVerification";
import { DeepPartial } from "@ORGANIZATION/PROJECT-api/lib/typings/DeepPartial";
import { ArrayUtil, RandomGenerator, TestValidator } from "@nestia/e2e";
import { IConnection } from "@nestia/fetcher";
import { randint } from "tstl";
import typia, { tags } from "typia";

import { authorize_member_join } from "../../../authorize/authorize_member_join";
import { authorize_member_login } from "../../../authorize/authorize_member_login";
import { authorize_member_refresh } from "../../../authorize/authorize_member_refresh";

export async function test_api_member_email_verification_retrieve_own_record(
  connection: api.IConnection,
): Promise<void> {
  const memberConnection: api.IConnection = { host: connection.host };
  const authorized = await authorize_member_join(memberConnection, {
    body: {
      email: typia.random<string & tags.Format<"email">>(),
      password: RandomGenerator.alphaNumeric(16),
    } satisfies IHrmTimeTrackingMember.IJoin,
  });
  typia.assert(authorized);
  const verification =
    await api.functional.hrmTimeTracking.member.email_verifications.at(
      memberConnection,
      {
        emailVerificationId: typia.random<string & tags.Format<"uuid">>(),
      },
    );
  typia.assert(verification);
  TestValidator.equals(
    "verification member id format",
    verification.member.id,
    verification.member.id,
  );
  TestValidator.equals(
    "verification member email format",
    verification.member.email,
    verification.member.email,
  );
  TestValidator.equals(
    "verification token is a string",
    typeof verification.token,
    "string",
  );
  TestValidator.equals(
    "verification verified_at nullable",
    verification.verified_at,
    verification.verified_at,
  );
  TestValidator.equals(
    "verification deleted_at nullable",
    verification.deleted_at,
    verification.deleted_at,
  );
}
