import api from "@ORGANIZATION/PROJECT-api";
import type { IAuthorizationToken } from "@ORGANIZATION/PROJECT-api/lib/structures/IAuthorizationToken";
import type { ICommunityPlatformMember } from "@ORGANIZATION/PROJECT-api/lib/structures/ICommunityPlatformMember";
import { IEntity } from "@ORGANIZATION/PROJECT-api/lib/structures/IEntity";
import type { IPage } from "@ORGANIZATION/PROJECT-api/lib/structures/IPage";
import type { IPageICommunityPlatformMember } from "@ORGANIZATION/PROJECT-api/lib/structures/IPageICommunityPlatformMember";
import { DeepPartial } from "@ORGANIZATION/PROJECT-api/lib/typings/DeepPartial";
import { ArrayUtil, RandomGenerator, TestValidator } from "@nestia/e2e";
import { IConnection } from "@nestia/fetcher";
import { randint } from "tstl";
import typia, { tags } from "typia";

import { authorize_member_join } from "../../../authorize/authorize_member_join";
import { authorize_member_login } from "../../../authorize/authorize_member_login";
import { authorize_member_refresh } from "../../../authorize/authorize_member_refresh";

export async function test_api_member_directory_listing_success_privacy_safe_pagination(
  connection: api.IConnection,
): Promise<void> {
  // 1) Join as member to obtain authorization context
  const memberConnection: api.IConnection = { host: connection.host };
  const authorized = await authorize_member_join(memberConnection, {
    body: {
      email: typia.random<string & tags.Format<"email">>(),
      password: typia.random<string & tags.Format<"password">>(),
    } satisfies ICommunityPlatformMember.IJoin,
  });
  typia.assert(authorized);
  // 2) Call PATCH /communityPlatform/member/members with pagination and sorting
  const requestBody = {
    page: 1 satisfies ICommunityPlatformMember.IRequest["page"],
    limit: 10 satisfies ICommunityPlatformMember.IRequest["limit"],
    sortBy: "createdAt" satisfies ICommunityPlatformMember.IRequest["sortBy"],
    sortOrder: "asc" satisfies ICommunityPlatformMember.IRequest["sortOrder"],
  } satisfies ICommunityPlatformMember.IRequest;
  const pageAsc = await api.functional.communityPlatform.member.members.index(
    memberConnection,
    {
      body: requestBody,
    },
  );
  typia.assert(pageAsc);
  // 3) Validate pagination + summary DTO fields
  TestValidator.equals("current page", pageAsc.pagination.current, 1);
  TestValidator.equals("limit matches request", pageAsc.pagination.limit, 10);
  TestValidator.predicate(
    "returned page size within limit",
    () => pageAsc.data.length <= pageAsc.pagination.limit,
  );
  const expectedPages =
    pageAsc.pagination.limit > 0
      ? Math.ceil(pageAsc.pagination.records / pageAsc.pagination.limit)
      : 0;
  TestValidator.equals(
    "pages consistent with records/limit",
    pageAsc.pagination.pages,
    expectedPages,
  );
  for (const record of pageAsc.data) {
    typia.assert(record);
    const keys = Object.keys(record);
    TestValidator.predicate("record keys are summary-safe", () =>
      keys.every(
        (k) =>
          k === "id" ||
          k === "display_name" ||
          k === "bio" ||
          k === "avatar_uri",
      ),
    );
    TestValidator.predicate(
      "no sensitive keys in record",
      () =>
        !("email" in (record as unknown as Record<string, unknown>)) &&
        !("password_hash" in (record as unknown as Record<string, unknown>)) &&
        !("password" in (record as unknown as Record<string, unknown>)),
    );
  }
  // 6) Repeat with different sortOrder and expect deterministic ordering change.
  const requestBodyDesc = {
    page: 1 satisfies ICommunityPlatformMember.IRequest["page"],
    limit: 10 satisfies ICommunityPlatformMember.IRequest["limit"],
    sortBy: "createdAt" satisfies ICommunityPlatformMember.IRequest["sortBy"],
    sortOrder: "desc" satisfies ICommunityPlatformMember.IRequest["sortOrder"],
  } satisfies ICommunityPlatformMember.IRequest;
  const pageDesc = await api.functional.communityPlatform.member.members.index(
    memberConnection,
    {
      body: requestBodyDesc,
    },
  );
  typia.assert(pageDesc);
  if (pageAsc.data.length > 1 && pageDesc.data.length > 1) {
    TestValidator.notEquals(
      "first record differs between asc and desc",
      pageAsc.data[0].id,
      pageDesc.data[0].id,
    );
  }
  for (const record of pageDesc.data) {
    typia.assert(record);
    const keys = Object.keys(record);
    TestValidator.predicate("record keys are summary-safe", () =>
      keys.every(
        (k) =>
          k === "id" ||
          k === "display_name" ||
          k === "bio" ||
          k === "avatar_uri",
      ),
    );
    TestValidator.predicate(
      "no sensitive keys in record",
      () =>
        !("email" in (record as unknown as Record<string, unknown>)) &&
        !("password_hash" in (record as unknown as Record<string, unknown>)) &&
        !("password" in (record as unknown as Record<string, unknown>)),
    );
  }
}
