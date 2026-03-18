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

export async function test_api_member_directory_sorting_order_and_soft_delete_default_filter(
  connection: api.IConnection,
): Promise<void> {
  const seed = RandomGenerator.alphabets(8);
  // 1) Authenticate as a member and ensure we have an organization context.
  // Since we don't have a direct endpoint to create/soft-delete members beyond join,
  // we validate the default filtering expectation by asserting deleted_at is null
  // for all returned records.
  const baseMemberConnection: api.IConnection = { host: connection.host };
  const auth: IErpHrmTimeTrackingMember.IAuthorized =
    await authorize_member_join(baseMemberConnection, {
      body: {
        email: `${seed}-owner@example.com` as string & tags.Format<"email">,
        password: "Password-1234!",
        organizationName: `${seed}-org`,
        organizationDescription: `${seed}-org-description`,
        organizationCurrencyCode: "KRW",
        organizationTimezone: "Asia/Seoul",
        organizationFiscalStartMonth: 1,
        href: "https://example.com/join" as string & tags.Format<"uri">,
        referrer: "https://example.com/ref" as string & tags.Format<"uri">,
        ip: "127.0.0.1" as string & tags.Format<"ipv4">,
      } satisfies IErpHrmTimeTrackingMember.IJoin,
    });
  typia.assert(auth);
  const memberConnection: api.IConnection = { host: connection.host };
  memberConnection.headers ??= {};
  memberConnection.headers.Authorization = auth.token.access;
  // 2) Create additional members to exercise sorting and pagination.
  // We join additional accounts with the same organization context if supported by the join workflow.
  // If the implementation scopes organization by join payload, this ensures they appear in the same org.
  // (We reuse the same organizationName.)
  const extraAccounts = ArrayUtil.repeat(5, (i) => {
    const suffix = `${seed}-m${i}`;
    return suffix;
  });
  for (const suffix of extraAccounts) {
    const c: api.IConnection = { host: connection.host };
    const joined = await authorize_member_join(c, {
      body: {
        email: `${suffix}@example.com` as string & tags.Format<"email">,
        password: "Password-1234!",
        organizationName: `${seed}-org`,
        organizationDescription: `${seed}-org-description`,
        organizationCurrencyCode: "KRW",
        organizationTimezone: "Asia/Seoul",
        organizationFiscalStartMonth: 1,
        href: `https://example.com/join/${suffix}` as
          | (string & tags.Format<"uri">)
          | (string & tags.Format<"uri">),
        referrer: `https://example.com/ref/${suffix}` as
          | (string & tags.Format<"uri">)
          | (string & tags.Format<"uri">),
      } satisfies IErpHrmTimeTrackingMember.IJoin,
    });
    typia.assert(joined);
  }
  // 3) Sorting determinism (email asc) with search disabled.
  const sortByEmail = "email";
  const pageLimit = 3 satisfies number &
    tags.Type<"int32"> &
    tags.Minimum<1> &
    tags.Maximum<100>;
  const page1 = await api.functional.erpHrmTimeTracking.member.members.index(
    memberConnection,
    {
      body: {
        search: undefined,
        sortBy: sortByEmail,
        sortOrder: "asc",
        page: 1 as number & tags.Type<"int32"> & tags.Minimum<1>,
        limit: pageLimit,
      } satisfies IErpHrmTimeTrackingMember.IRequest,
    },
  );
  typia.assert(page1);
  const emailsPage1 = page1.data.map((m) => m.email);
  const sortedCopy1 = [...emailsPage1].sort((a, b) => a.localeCompare(b));
  TestValidator.equals("page1 email order (asc)", emailsPage1, sortedCopy1);
  TestValidator.predicate(
    "page1 excludes soft-deleted members by default",
    page1.data.every((m) => m.deleted_at === null),
  );
  // 4) Pagination non-overlap and consistency.
  const page2 = await api.functional.erpHrmTimeTracking.member.members.index(
    memberConnection,
    {
      body: {
        search: undefined,
        sortBy: sortByEmail,
        sortOrder: "asc",
        page: 2 as number & tags.Type<"int32"> & tags.Minimum<1>,
        limit: pageLimit,
      } satisfies IErpHrmTimeTrackingMember.IRequest,
    },
  );
  typia.assert(page2);
  const ids1 = page1.data.map((m) => m.id);
  const ids2 = page2.data.map((m) => m.id);
  // Non-overlapping subsets
  const overlap = ids1.filter((id) => ids2.includes(id));
  TestValidator.equals("page1 and page2 ids do not overlap", overlap, []);
  // Metadata should remain coherent with filtering
  TestValidator.predicate(
    "pagination metadata is coherent",
    page1.pagination.records >= page1.data.length,
  );
  TestValidator.equals(
    "pagination records consistent across pages",
    page2.pagination.records,
    page1.pagination.records,
  );
  TestValidator.equals(
    "pagination pages consistent across pages",
    page2.pagination.pages,
    page1.pagination.pages,
  );
  // 5) Verify summary fields only (password/auth material must be absent).
  // typia.assert already validates types; we only check absence of obvious keys.
  const forbiddenKeys = [
    "password",
    "password_hash",
    "token",
    "refresh",
    "access",
  ] as const;
  for (const m of page1.data) {
    const keys = Object.keys(m);
    for (const k of forbiddenKeys) {
      TestValidator.predicate(
        `summary does not include ${k}`,
        () => !keys.includes(k),
      );
    }
  }
}
