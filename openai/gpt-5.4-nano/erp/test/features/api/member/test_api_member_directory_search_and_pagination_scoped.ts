import api from "@ORGANIZATION/PROJECT-api";
import type { IAuthorizationToken } from "@ORGANIZATION/PROJECT-api/lib/structures/IAuthorizationToken";
import { IEntity } from "@ORGANIZATION/PROJECT-api/lib/structures/IEntity";
import type { IErpHrmTimeTrackingMember } from "@ORGANIZATION/PROJECT-api/lib/structures/IErpHrmTimeTrackingMember";
import type { IPage } from "@ORGANIZATION/PROJECT-api/lib/structures/IPage";
import type { IPageIErpHrmTimeTrackingMember } from "@ORGANIZATION/PROJECT-api/lib/structures/IPageIErpHrmTimeTrackingMember";
import { DeepPartial } from "@ORGANIZATION/PROJECT-api/lib/typings/DeepPartial";
import { ArrayUtil, RandomGenerator, TestValidator } from "@nestia/e2e";
import { IConnection } from "@nestia/fetcher";
import { randint } from "tstl";
import typia, { tags } from "typia";

import { authorize_member_join } from "../../../authorize/authorize_member_join";
import { authorize_member_login } from "../../../authorize/authorize_member_login";
import { authorize_member_refresh } from "../../../authorize/authorize_member_refresh";

export async function test_api_member_directory_search_and_pagination_scoped(
  connection: api.IConnection,
): Promise<void> {
  // Actor-specific connection for member join/session (base connection must not be used directly)
  const memberConnection: api.IConnection = { host: connection.host };
  const unique = RandomGenerator.alphabets(12);
  const joinEmail1 = `${unique}+a@test.com`;
  const joinEmail2 = `${unique}+b@test.com`;
  const organizationName1 = `org-${unique}-1`;
  const organizationName2 = `org-${unique}-2`;
  const password = "Aa1!aaaa";
  const href = `https://example.com/join/${unique}`;
  const referrer = `https://example.com/ref/${unique}`;
  const timezone = "Asia/Seoul";
  const currencyCode = "KRW";
  const authorized1 = await authorize_member_join(memberConnection, {
    body: {
      email: joinEmail1,
      password,
      organizationName: organizationName1,
      organizationDescription: RandomGenerator.paragraph({ sentences: 2 }),
      organizationLogoUrl: null,
      organizationCurrencyCode: currencyCode,
      organizationTimezone: timezone,
      organizationFiscalStartMonth: 1,
      href,
      referrer,
    } satisfies IErpHrmTimeTrackingMember.IJoin,
  });
  typia.assert(authorized1);
  const dirConnection1: api.IConnection = { host: connection.host };
  dirConnection1.headers ??= {};
  dirConnection1.headers.Authorization = authorized1.token.access;
  const searchTerm1 = joinEmail1.split("@")[0];
  const limit = 5 satisfies number &
    tags.Type<"int32"> &
    tags.Minimum<1> &
    tags.Maximum<100>;
  const page1 = await api.functional.erpHrmTimeTracking.member.members.index(
    dirConnection1,
    {
      body: {
        search: searchTerm1,
        page: 1,
        limit,
      } satisfies IErpHrmTimeTrackingMember.IRequest,
    },
  );
  typia.assert(page1);
  typia.assert(page1.pagination);
  typia.assert(page1.data);
  for (const item of page1.data) {
    typia.assert(item);
    // typia.assert already guarantees the DTO shape (id/email/created_at/updated_at/deleted_at)
    // and excludes any auth/password material because it is not part of the DTO.
  }
  // Join a second member for a different organization to validate tenant scoping
  const memberConnection2: api.IConnection = { host: connection.host };
  const authorized2 = await authorize_member_join(memberConnection2, {
    body: {
      email: joinEmail2,
      password,
      organizationName: organizationName2,
      organizationDescription: RandomGenerator.paragraph({ sentences: 2 }),
      organizationLogoUrl: null,
      organizationCurrencyCode: currencyCode,
      organizationTimezone: timezone,
      organizationFiscalStartMonth: 1,
      href,
      referrer,
    } satisfies IErpHrmTimeTrackingMember.IJoin,
  });
  typia.assert(authorized2);
  // Search in org #1 for a member belonging to org #2 should return none
  const searchTerm2 = joinEmail2.split("@")[0];
  const scopedPage =
    await api.functional.erpHrmTimeTracking.member.members.index(
      dirConnection1,
      {
        body: {
          search: searchTerm2,
          page: 1,
          limit,
        } satisfies IErpHrmTimeTrackingMember.IRequest,
      },
    );
  typia.assert(scopedPage);
  TestValidator.predicate(
    "scoped results exclude members from other organizations",
    () =>
      scopedPage.data.every(
        (x) => x.email.toLowerCase() !== joinEmail2.toLowerCase(),
      ),
  );
  // Request a later page beyond available results
  const laterPageNumber = 100 satisfies number &
    tags.Type<"int32"> &
    tags.Minimum<1>;
  const laterPage =
    await api.functional.erpHrmTimeTracking.member.members.index(
      dirConnection1,
      {
        body: {
          search: searchTerm1,
          page: laterPageNumber,
          limit,
        } satisfies IErpHrmTimeTrackingMember.IRequest,
      },
    );
  typia.assert(laterPage);
  TestValidator.equals("later page data is empty", laterPage.data.length, 0);
  TestValidator.equals(
    "later page preserves total records count",
    laterPage.pagination.records,
    page1.pagination.records,
  );
  TestValidator.equals(
    "later page preserves total pages count",
    laterPage.pagination.pages,
    page1.pagination.pages,
  );
}
