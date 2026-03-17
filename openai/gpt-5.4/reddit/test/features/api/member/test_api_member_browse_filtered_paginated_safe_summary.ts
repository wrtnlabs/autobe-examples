import api from "@ORGANIZATION/PROJECT-api";
import type { ICommunityPlatformMember } from "@ORGANIZATION/PROJECT-api/lib/structures/ICommunityPlatformMember";
import { IEntity } from "@ORGANIZATION/PROJECT-api/lib/structures/IEntity";
import type { IPage } from "@ORGANIZATION/PROJECT-api/lib/structures/IPage";
import type { IPageICommunityPlatformMember } from "@ORGANIZATION/PROJECT-api/lib/structures/IPageICommunityPlatformMember";
import { DeepPartial } from "@ORGANIZATION/PROJECT-api/lib/typings/DeepPartial";
import { ArrayUtil, RandomGenerator, TestValidator } from "@nestia/e2e";
import { IConnection } from "@nestia/fetcher";
import { randint } from "tstl";
import typia, { tags } from "typia";

export async function test_api_member_browse_filtered_paginated_safe_summary(
  connection: api.IConnection,
): Promise<void> {
  const memberConnection: api.IConnection = {
    host: connection.host,
    headers: connection.headers,
    simulate: connection.simulate,
    logger: connection.logger,
    encryption: connection.encryption,
    options: connection.options,
    fetch: connection.fetch,
  };
  const page = 1;
  const limit = 10;
  const lastSignedInFrom = "2024-01-01T00:00:00.000Z";
  const lastSignedInTo = "2099-12-31T23:59:59.999Z";
  const status = "active";
  const emailVerified = true;
  const request = {
    email_verified: emailVerified,
    status,
    last_signed_in_from: lastSignedInFrom,
    last_signed_in_to: lastSignedInTo,
    sort: "+last_signed_in_at",
    page,
    limit,
  } satisfies ICommunityPlatformMember.IRequest;
  const first: IPageICommunityPlatformMember.ISummary =
    await api.functional.communityPlatform.members.index(memberConnection, {
      body: request,
    });
  typia.assert(first);
  const second: IPageICommunityPlatformMember.ISummary =
    await api.functional.communityPlatform.members.index(memberConnection, {
      body: request,
    });
  typia.assert(second);
  TestValidator.equals(
    "pagination current echoes request",
    first.pagination.current,
    page,
  );
  TestValidator.equals(
    "pagination limit echoes request",
    first.pagination.limit,
    limit,
  );
  TestValidator.predicate(
    "records cover current page data length",
    first.pagination.records >= first.data.length,
  );
  TestValidator.predicate(
    "page size does not exceed limit",
    first.data.length <= limit,
  );
  TestValidator.equals(
    "pages is zero when no records",
    first.pagination.records === 0,
    first.pagination.pages === 0,
  );
  if (first.pagination.records > 0) {
    TestValidator.equals(
      "pages follow ceil(records / limit)",
      first.pagination.pages,
      Math.ceil(first.pagination.records / first.pagination.limit),
    );
  }
  TestValidator.equals(
    "repeated call pagination current stable",
    first.pagination.current,
    second.pagination.current,
  );
  TestValidator.equals(
    "repeated call pagination limit stable",
    first.pagination.limit,
    second.pagination.limit,
  );
  TestValidator.equals(
    "repeated call pagination records stable",
    first.pagination.records,
    second.pagination.records,
  );
  TestValidator.equals(
    "repeated call pagination pages stable",
    first.pagination.pages,
    second.pagination.pages,
  );
  TestValidator.equals(
    "repeated call ordering stable",
    first.data.map((member) => member.id),
    second.data.map((member) => member.id),
  );
  const expectedKeys = [
    "id",
    "code",
    "email",
    "email_verified",
    "status",
    "last_signed_in_at",
    "created_at",
    "updated_at",
    "deleted_at",
  ].sort();
  for (const member of first.data) {
    typia.assert(member);
    TestValidator.equals(
      "email_verified filter applied",
      member.email_verified,
      emailVerified,
    );
    TestValidator.equals("status filter applied", member.status, status);
    TestValidator.equals("deleted members are hidden", member.deleted_at, null);
    TestValidator.predicate(
      "last_signed_in_at exists when ranged filter is used",
      member.last_signed_in_at !== null,
    );
    if (member.last_signed_in_at !== null) {
      const signedInAt = new Date(member.last_signed_in_at).getTime();
      const from = new Date(lastSignedInFrom).getTime();
      const to = new Date(lastSignedInTo).getTime();
      TestValidator.predicate(
        "last_signed_in_at is within requested range",
        signedInAt >= from && signedInAt <= to,
      );
    }
    const actualKeys = Object.keys(member).sort();
    TestValidator.equals(
      "safe summary projection keys only",
      actualKeys,
      expectedKeys,
    );
    TestValidator.equals(
      "password hash is never exposed",
      Object.prototype.hasOwnProperty.call(member, "password_hash"),
      false,
    );
  }
}
