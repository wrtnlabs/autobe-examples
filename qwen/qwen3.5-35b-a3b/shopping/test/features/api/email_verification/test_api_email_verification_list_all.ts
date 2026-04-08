import api from "@ORGANIZATION/PROJECT-api";
import type { IAuthorizationToken } from "@ORGANIZATION/PROJECT-api/lib/structures/IAuthorizationToken";
import type { IEcommerceMallMember } from "@ORGANIZATION/PROJECT-api/lib/structures/IEcommerceMallMember";
import type { IEcommerceMallMemberEmailVerification } from "@ORGANIZATION/PROJECT-api/lib/structures/IEcommerceMallMemberEmailVerification";
import { IEntity } from "@ORGANIZATION/PROJECT-api/lib/structures/IEntity";
import type { IPage } from "@ORGANIZATION/PROJECT-api/lib/structures/IPage";
import type { IPageIEcommerceMallMemberEmailVerification } from "@ORGANIZATION/PROJECT-api/lib/structures/IPageIEcommerceMallMemberEmailVerification";
import { DeepPartial } from "@ORGANIZATION/PROJECT-api/lib/typings/DeepPartial";
import { ArrayUtil, RandomGenerator, TestValidator } from "@nestia/e2e";
import { IConnection } from "@nestia/fetcher";
import { randint } from "tstl";
import typia, { tags } from "typia";

import { authorize_member_join } from "../../../authorize/authorize_member_join";
import { authorize_member_login } from "../../../authorize/authorize_member_login";
import { authorize_member_refresh } from "../../../authorize/authorize_member_refresh";

/**
 * Test listing all email verification records for authenticated member.
 *
 * Validates the primary success path for listing email verification records associated with an authenticated member account. The test creates a member account through registration, then retrieves their email verification records to verify proper data isolation, pagination, and default sorting behavior.
 *
 * Special attention is given to verifying that only the authenticated member's own verification records are returned, that the default pagination and sorting work correctly, and that all required fields are present in the response.
 *
 * 1. Member customer registers with randomized credentials including email, password, display name, and phone number.
 * 2. Member authenticates and receives JWT tokens for API access.
 * 3. List email verification records with minimal filters to retrieve all non-archived records.
 * 4. Validate pagination metadata: current page, limit, total records, and total pages.
 * 5. Verify data array contains the member's own email verification record created during registration.
 * 6. Validate each record has required fields with correct types and valid values.
 */
export async function test_api_email_verification_list_all(
  connection: api.IConnection,
): Promise<void> {
  // 1. Member registration and authentication
  const memberConnection: api.IConnection = { host: connection.host };
  const memberAuth = await authorize_member_join(memberConnection, {
    body: {
      email: typia.random<string & tags.Format<"email">>(),
      password: RandomGenerator.alphaNumeric(16),
      display_name: RandomGenerator.name(),
      phone_number: RandomGenerator.mobile(),
      href: typia.random<string & tags.Format<"uri">>(),
      referrer: typia.random<string & tags.Format<"uri">>(),
      ip: typia.random<string & tags.Format<"ipv4">>(),
    } satisfies IEcommerceMallMember.IJoin,
  });
  typia.assert(memberAuth);
  // Create connection with member token for subsequent API calls
  const authenticatedConnection: api.IConnection = {
    host: connection.host,
    headers: {
      ...connection.headers,
      Authorization: memberAuth.token.access,
    },
  };
  // 2. List email verification records with minimal filters
  const response =
    await api.functional.ecommerceMall.member.email_verifications.index(
      authenticatedConnection,
      {
        body: {} satisfies IEcommerceMallMemberEmailVerification.IRequest,
      },
    );
  typia.assert(response);
  // 3. Validate pagination metadata
  TestValidator.equals(
    "pagination current page",
    response.pagination.current,
    1,
  );
  TestValidator.equals("pagination limit", response.pagination.limit, 20);
  TestValidator.predicate(
    "pagination records non-negative",
    response.pagination.records >= 0,
  );
  TestValidator.equals(
    "pagination pages",
    response.pagination.pages,
    Math.ceil(response.pagination.records / response.pagination.limit),
  );
  // 4. Verify data array contains at least the member's verification record
  TestValidator.predicate(
    "data array has at least one record",
    response.data.length >= 1,
  );
  // 5. Find member's own verification record
  const memberRecord = response.data.find(
    (record) => record.email === memberAuth.email,
  );
  TestValidator.predicate(
    "member's verification record exists",
    memberRecord !== undefined,
  );
  // 6. Validate record structure and fields
  typia.assert(memberRecord!);
  const record = memberRecord!;
  typia.assert(record.email);
  TestValidator.equals(
    "record email matches member email",
    record.email,
    memberAuth.email,
  );
  TestValidator.predicate(
    "record status is valid",
    ["pending", "used", "expired", "archived"].includes(record.status),
  );
  TestValidator.predicate(
    "created_at is valid datetime format",
    /^\d{4}-\d{2}-\d{2}T\d{2}:\d{2}:\d{2}/.test(record.created_at),
  );
  TestValidator.predicate(
    "updated_at is valid datetime format",
    /^\d{4}-\d{2}-\d{2}T\d{2}:\d{2}:\d{2}/.test(record.updated_at),
  );
  TestValidator.predicate(
    "expired_at is valid datetime format",
    /^\d{4}-\d{2}-\d{2}T\d{2}:\d{2}:\d{2}/.test(record.expired_at),
  );
  // 7. Verify timestamps are in the correct time order
  TestValidator.predicate(
    "created_at is before expired_at",
    new Date(record.created_at).getTime() <
      new Date(record.expired_at).getTime(),
  );
  TestValidator.predicate(
    "created_at is before updated_at or equal",
    new Date(record.created_at).getTime() <=
      new Date(record.updated_at).getTime(),
  );
  // 8. Verify default sorting: newest first
  if (response.data.length >= 2) {
    for (let i = 0; i < response.data.length - 1; i++) {
      const currentItem = response.data[i];
      const nextItem = response.data[i + 1];
      TestValidator.predicate(
        "records sorted by created_at DESC",
        new Date(currentItem.created_at).getTime() >=
          new Date(nextItem.created_at).getTime(),
      );
    }
  }
  // 9. Verify archived records are excluded by default
  const hasArchived = response.data.some(
    (record) => record.status === "archived",
  );
  TestValidator.predicate("archived records excluded by default", !hasArchived);
}