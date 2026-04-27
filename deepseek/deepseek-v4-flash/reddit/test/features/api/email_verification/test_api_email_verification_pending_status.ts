import api from "@ORGANIZATION/PROJECT-api";
import type { IAuthorizationToken } from "@ORGANIZATION/PROJECT-api/lib/structures/IAuthorizationToken";
import type { ICommunityPlatformMember } from "@ORGANIZATION/PROJECT-api/lib/structures/ICommunityPlatformMember";
import type { ICommunityPlatformMemberEmailVerification } from "@ORGANIZATION/PROJECT-api/lib/structures/ICommunityPlatformMemberEmailVerification";
import type { ICommunityPlatformProfile } from "@ORGANIZATION/PROJECT-api/lib/structures/ICommunityPlatformProfile";
import { IEntity } from "@ORGANIZATION/PROJECT-api/lib/structures/IEntity";
import { DeepPartial } from "@ORGANIZATION/PROJECT-api/lib/typings/DeepPartial";
import { ArrayUtil, RandomGenerator, TestValidator } from "@nestia/e2e";
import { IConnection } from "@nestia/fetcher";
import { randint } from "tstl";
import typia, { tags } from "typia";

import { authorize_member_join } from "../../../authorize/authorize_member_join";
import { authorize_member_login } from "../../../authorize/authorize_member_login";
import { authorize_member_refresh } from "../../../authorize/authorize_member_refresh";

export async function test_api_email_verification_pending_status(
  connection: api.IConnection,
): Promise<void> {
  // 1. Register a new member (triggers automatic email verification record creation)
  const memberConnection: api.IConnection = { host: connection.host };
  const authorized = await authorize_member_join(memberConnection, {});
  // 2. The email verification record was created automatically upon registration.
  //    Obtain the verification UUID from the created member record.
  //    Here we use the member's UUID from the join response.
  const verificationId = authorized.id;
  // 3. Retrieve the email verification record
  const verification =
    await api.functional.communityPlatform.member.email_verifications.at(
      memberConnection,
      {
        verificationId,
      },
    );
  typia.assert(verification);
  // 4. Validate response structure and field values
  // 4.1. id matches the requested verificationId
  TestValidator.equals("verification id matches", verification.id, verificationId);
  // 4.2. member summary matches the registered member
  TestValidator.equals("member id", verification.member.id, authorized.id);
  TestValidator.equals("member email", verification.member.email, authorized.email);
  TestValidator.equals("member username", verification.member.username, authorized.username);
  // 4.3. verified_at is null (pending — email not yet confirmed)
  TestValidator.equals("verified_at is null", verification.verified_at, null);
  // 4.4. issued_at is a valid past timestamp (before or equal to now)
  const now = new Date();
  const issuedAt = new Date(verification.issued_at);
  TestValidator.predicate(
    "issued_at is in the past",
    issuedAt.getTime() <= now.getTime(),
  );
  // 4.5. expired_at is a valid future timestamp
  const expiredAt = new Date(verification.expired_at);
  TestValidator.predicate(
    "expired_at is in the future",
    expiredAt.getTime() > now.getTime(),
  );
  // 4.6. created_at and updated_at are valid ISO 8601 timestamps
  TestValidator.predicate(
    "created_at is valid",
    !isNaN(new Date(verification.created_at).getTime()),
  );
  TestValidator.predicate(
    "updated_at is valid",
    !isNaN(new Date(verification.updated_at).getTime()),
  );
}