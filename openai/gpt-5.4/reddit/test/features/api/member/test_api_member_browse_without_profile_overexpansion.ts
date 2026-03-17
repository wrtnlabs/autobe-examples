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

export async function test_api_member_browse_without_profile_overexpansion(
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
  const request = {
    page: 1,
    limit: 10,
  } satisfies ICommunityPlatformMember.IRequest;
  const page = await api.functional.communityPlatform.members.index(
    memberConnection,
    {
      body: request,
    },
  );
  typia.assert<IPageICommunityPlatformMember.ISummary>(page);
  typia.assertEquals<IPageICommunityPlatformMember.ISummary>(page);
  TestValidator.equals(
    "pagination current page matches request",
    page.pagination.current,
    request.page,
  );
  TestValidator.equals(
    "pagination limit matches request",
    page.pagination.limit,
    request.limit,
  );
  TestValidator.predicate(
    "record count is not smaller than returned rows",
    page.pagination.records >= page.data.length,
  );
  TestValidator.predicate(
    "page count is non-negative",
    page.pagination.pages >= 0,
  );
  TestValidator.predicate(
    "returned row count respects limit",
    page.data.length <= request.limit,
  );
  for (const member of page.data) {
    typia.assertEquals<ICommunityPlatformMember.ISummary>(member);
    TestValidator.predicate(
      "member summary has stable account identity",
      member.id.length > 0 && member.code.length > 0 && member.email.length > 0,
    );
    TestValidator.predicate(
      "member summary exposes lifecycle timestamps safely",
      member.created_at.length > 0 && member.updated_at.length > 0,
    );
    TestValidator.predicate(
      "nullable sign-in fields do not break list rendering",
      member.last_signed_in_at === null || member.last_signed_in_at.length > 0,
    );
    TestValidator.predicate(
      "nullable deletion fields do not break list rendering",
      member.deleted_at === null || member.deleted_at.length > 0,
    );
  }
}
