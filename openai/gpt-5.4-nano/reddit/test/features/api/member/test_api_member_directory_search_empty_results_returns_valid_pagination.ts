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

export async function test_api_member_directory_search_empty_results_returns_valid_pagination(
  connection: api.IConnection,
): Promise<void> {
  // 1) Join as a member.
  const memberConnection: api.IConnection = { host: connection.host };
  await authorize_member_join(memberConnection, {
    body: {
      email: typia.random<string & tags.Format<"email">>(),
      password: typia.random<string & tags.Format<"password">>(),
    } satisfies ICommunityPlatformMember.IJoin,
  });
  const searchTerm = "no_such_member_identity_zzzzzzzz_very_unlikely";
  // 2) Call PATCH /communityPlatform/member/members with a non-matching search.
  const page1Limit5 =
    await api.functional.communityPlatform.member.members.index(
      memberConnection,
      {
        body: {
          search: searchTerm,
          page: 1 satisfies number & tags.Type<"int32"> & tags.Minimum<1>,
          limit: 5 satisfies number &
            tags.Type<"int32"> &
            tags.Minimum<1> &
            tags.Maximum<100>,
        } satisfies ICommunityPlatformMember.IRequest,
      },
    );
  typia.assert(page1Limit5);
  // 3) Validate empty paginated response.
  TestValidator.equals(
    "member directory should return empty data",
    page1Limit5.data,
    [],
  );
  TestValidator.equals(
    "records should be 0",
    page1Limit5.pagination.records,
    0,
  );
  TestValidator.equals("pages should be 0", page1Limit5.pagination.pages, 0);
  TestValidator.equals(
    "current page should be 1",
    page1Limit5.pagination.current,
    1,
  );
  TestValidator.equals(
    "limit should equal requested limit",
    page1Limit5.pagination.limit,
    5,
  );
  // 4) Privacy constraint: typia.assert already guarantees only ISummary fields exist.
  // We additionally validate that no sensitive fields are present in each record
  // by checking that the returned objects only contain the DTO properties.
  TestValidator.predicate(
    "each member summary should not expose sensitive fields",
    () =>
      page1Limit5.data.every(
        (m) =>
          ["id", "display_name", "bio", "avatar_uri"].every((k) =>
            Object.prototype.hasOwnProperty.call(m, k),
          ) &&
          !Object.prototype.hasOwnProperty.call(m, "email") &&
          !Object.prototype.hasOwnProperty.call(m, "password_hash"),
      ),
  );
  // 5) Repeat with another call (still records=0) and ensure consistent empty structure.
  const page1Repeat =
    await api.functional.communityPlatform.member.members.index(
      memberConnection,
      {
        body: {
          search: searchTerm,
          page: 1 satisfies number & tags.Type<"int32"> & tags.Minimum<1>,
          limit: 5 satisfies number &
            tags.Type<"int32"> &
            tags.Minimum<1> &
            tags.Maximum<100>,
        } satisfies ICommunityPlatformMember.IRequest,
      },
    );
  typia.assert(page1Repeat);
  TestValidator.equals(
    "repeat call should return empty data",
    page1Repeat.data,
    [],
  );
  TestValidator.equals(
    "repeat records should be 0",
    page1Repeat.pagination.records,
    0,
  );
  TestValidator.equals(
    "repeat pages should be 0",
    page1Repeat.pagination.pages,
    0,
  );
  TestValidator.equals(
    "repeat current page should be 1",
    page1Repeat.pagination.current,
    1,
  );
  TestValidator.equals(
    "repeat limit should equal requested limit",
    page1Repeat.pagination.limit,
    5,
  );
}
