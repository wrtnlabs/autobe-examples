import api from "@ORGANIZATION/PROJECT-api";
import type { IAuthorizationToken } from "@ORGANIZATION/PROJECT-api/lib/structures/IAuthorizationToken";
import { IEntity } from "@ORGANIZATION/PROJECT-api/lib/structures/IEntity";
import type { IHrmsMember } from "@ORGANIZATION/PROJECT-api/lib/structures/IHrmsMember";
import type { IHrmsMemberEmailVerification } from "@ORGANIZATION/PROJECT-api/lib/structures/IHrmsMemberEmailVerification";
import type { IHrmsOrganization } from "@ORGANIZATION/PROJECT-api/lib/structures/IHrmsOrganization";
import type { IHrmsOrganizationMember } from "@ORGANIZATION/PROJECT-api/lib/structures/IHrmsOrganizationMember";
import type { IHrmsOrganizationRole } from "@ORGANIZATION/PROJECT-api/lib/structures/IHrmsOrganizationRole";
import type { IPage } from "@ORGANIZATION/PROJECT-api/lib/structures/IPage";
import type { IPageIHrmsMemberEmailVerification } from "@ORGANIZATION/PROJECT-api/lib/structures/IPageIHrmsMemberEmailVerification";
import { DeepPartial } from "@ORGANIZATION/PROJECT-api/lib/typings/DeepPartial";
import { ArrayUtil, RandomGenerator, TestValidator } from "@nestia/e2e";
import { IConnection } from "@nestia/fetcher";
import { randint } from "tstl";
import typia, { tags } from "typia";

import { authorize_member_join } from "../../../authorize/authorize_member_join";
import { authorize_member_login } from "../../../authorize/authorize_member_login";
import { authorize_member_refresh } from "../../../authorize/authorize_member_refresh";

export async function test_api_email_verifications_index_with_member_auth(
  connection: api.IConnection,
): Promise<void> {
  // 1. Create member account and get authorization
  const memberConnection: api.IConnection = { host: connection.host };
  const authorized = await authorize_member_join(memberConnection, {
    body: {
      email: typia.random<string & tags.Format<"email">>(),
      password: RandomGenerator.alphaNumeric(16),
      display_name: RandomGenerator.name(),
      href: typia.random<string & tags.Format<"uri">>(),
      referrer: typia.random<string & tags.Format<"uri">>(),
    } satisfies IHrmsMember.IJoin,
  });
  typia.assert(authorized);
  // 2. Create authenticated connection with member token
  const authenticatedConnection: api.IConnection = {
    host: connection.host,
    headers: { Authorization: `Bearer ${authorized.token.access}` },
  };
  // 3. Retrieve email verification records
  const response = await api.functional.hrms.member.email_verifications.index(
    authenticatedConnection,
    {
      body: {} satisfies IHrmsMemberEmailVerification.IRequest,
    },
  );
  typia.assert(response);
  // 4. Validate pagination structure
  TestValidator.equals("pagination current", response.pagination.current, 1);
  TestValidator.predicate(
    "pagination limit positive",
    response.pagination.limit > 0,
  );
  TestValidator.predicate(
    "pagination records non-negative",
    response.pagination.records >= 0,
  );
  TestValidator.predicate(
    "pagination pages non-negative",
    response.pagination.pages >= 0,
  );
  // 5. Validate verification records exist
  TestValidator.predicate(
    "at least one verification record",
    response.data.length >= 1,
  );
  // 6. Verify the newly created member's verification record exists
  const memberRecord = response.data.find(
    (record) => record.member_email === authorized.email,
  );
  TestValidator.predicate(
    "member verification record exists in list",
    memberRecord !== undefined,
  );
  // 7. Validate status computation
  if (memberRecord) {
    const now = new Date();
    const expiresAt = new Date(memberRecord.expires_at);
    const usedAt = memberRecord.used_at ? new Date(memberRecord.used_at) : null;
    // Active: not used and not expired
    const isActive =
      memberRecord.status === "active" &&
      usedAt === null &&
      expiresAt.getTime() > now.getTime();
    // Used: record was used
    const isUsed = memberRecord.status === "used" && usedAt !== null;
    // Expired: past expiration
    const isExpired =
      memberRecord.status === "expired" && expiresAt.getTime() <= now.getTime();
    TestValidator.predicate(
      "status computed correctly",
      isActive || isUsed || isExpired,
    );
  }
  // 8. Validate all records have correct structure
  for (const record of response.data) {
    // Validate required fields have values
    TestValidator.equals(
      "record id is valid uuid",
      /\w{8}-\w{4}-\w{4}-\w{4}-\w{12}/i.test(record.id),
      true,
    );
    TestValidator.equals(
      "record email is valid format",
      /^[^\s@]+@[^\s@]+\.[^\s@]+$/.test(record.member_email),
      true,
    );
    TestValidator.equals(
      "record display name is non-empty",
      record.member_display_name.length > 0,
      true,
    );
  }
}
