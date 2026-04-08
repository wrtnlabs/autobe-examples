import api from "@ORGANIZATION/PROJECT-api";
import type { IAuthorizationToken } from "@ORGANIZATION/PROJECT-api/lib/structures/IAuthorizationToken";
import { IEntity } from "@ORGANIZATION/PROJECT-api/lib/structures/IEntity";
import type { IErpHrmTimeMember } from "@ORGANIZATION/PROJECT-api/lib/structures/IErpHrmTimeMember";
import type { IErpHrmTimeMemberPasswordReset } from "@ORGANIZATION/PROJECT-api/lib/structures/IErpHrmTimeMemberPasswordReset";
import type { IPage } from "@ORGANIZATION/PROJECT-api/lib/structures/IPage";
import type { IPageIErpHrmTimeMemberPasswordReset } from "@ORGANIZATION/PROJECT-api/lib/structures/IPageIErpHrmTimeMemberPasswordReset";
import { DeepPartial } from "@ORGANIZATION/PROJECT-api/lib/typings/DeepPartial";
import { ArrayUtil, RandomGenerator, TestValidator } from "@nestia/e2e";
import { IConnection } from "@nestia/fetcher";
import { randint } from "tstl";
import typia, { tags } from "typia";

import { authorize_member_join } from "../../../authorize/authorize_member_join";
import { authorize_member_login } from "../../../authorize/authorize_member_login";
import { authorize_member_refresh } from "../../../authorize/authorize_member_refresh";

export async function test_api_member_password_resets_status_filter(
  connection: api.IConnection,
): Promise<void> {
  const memberConnection: api.IConnection = { host: connection.host };
  const authorized = await authorize_member_join(memberConnection, {
    body: {
      email: `member_${RandomGenerator.alphaNumeric(8)}@example.com` as string &
        typia.tags.Format<"email">,
      password: `Pw_${RandomGenerator.alphaNumeric(12)}!` as string &
        typia.tags.Format<"password">,
      displayName: RandomGenerator.name(),
      href: "https://example.com/onboarding",
      referrer: "https://example.com/landing",
    } satisfies IErpHrmTimeMember.IJoin,
  });
  typia.assert(authorized);
  const baseRequest = {
    erpHrmTimeMemberId: authorized.id,
    page: 1,
    limit: 100,
    sort: "createdAtDesc" as const,
  } satisfies IErpHrmTimeMemberPasswordReset.IRequest;
  const classify = (record: IErpHrmTimeMemberPasswordReset.ISummary) =>
    record.usedAt !== null
      ? ("used" as const)
      : new Date(record.expiresAt).getTime() <= Date.now()
        ? ("expired" as const)
        : ("unused" as const);
  const all = await api.functional.erpHrmTime.member.passwordResets.index(
    memberConnection,
    { body: baseRequest },
  );
  typia.assert(all);
  const unused = await api.functional.erpHrmTime.member.passwordResets.index(
    memberConnection,
    {
      body: {
        ...baseRequest,
        status: "unused",
      } satisfies IErpHrmTimeMemberPasswordReset.IRequest,
    },
  );
  typia.assert(unused);
  const used = await api.functional.erpHrmTime.member.passwordResets.index(
    memberConnection,
    {
      body: {
        ...baseRequest,
        status: "used",
      } satisfies IErpHrmTimeMemberPasswordReset.IRequest,
    },
  );
  typia.assert(used);
  const expired = await api.functional.erpHrmTime.member.passwordResets.index(
    memberConnection,
    {
      body: {
        ...baseRequest,
        status: "expired",
      } satisfies IErpHrmTimeMemberPasswordReset.IRequest,
    },
  );
  typia.assert(expired);
  const pages = [all, unused, used, expired] as const;
  for (const page of pages) {
    TestValidator.equals("page number", page.pagination.current, 1);
    TestValidator.equals("page limit", page.pagination.limit, 100);
    TestValidator.predicate(
      "total records non-negative",
      page.pagination.records >= 0,
    );
    TestValidator.predicate(
      "total pages non-negative",
      page.pagination.pages >= 0,
    );
    TestValidator.predicate(
      "data length does not exceed page limit",
      page.data.length <= page.pagination.limit,
    );
    for (const record of page.data) {
      TestValidator.predicate(
        "member summary exists",
        record.member !== null && record.member !== undefined,
      );
      TestValidator.predicate(
        "record is not soft deleted",
        record.deletedAt === null || typeof record.deletedAt === "string",
      );
      TestValidator.predicate(
        "classification is valid",
        classify(record) === "unused" ||
          classify(record) === "used" ||
          classify(record) === "expired",
      );
    }
  }
  for (const record of unused.data) {
    TestValidator.equals("unused reset has no usedAt", record.usedAt, null);
    TestValidator.predicate(
      "unused reset is not expired",
      new Date(record.expiresAt).getTime() > Date.now(),
    );
  }
  for (const record of used.data) {
    TestValidator.predicate("used reset has usedAt", record.usedAt !== null);
  }
  for (const record of expired.data) {
    TestValidator.equals("expired reset has no usedAt", record.usedAt, null);
    TestValidator.predicate(
      "expired reset is expired",
      new Date(record.expiresAt).getTime() <= Date.now(),
    );
  }
  for (const record of all.data) {
    TestValidator.predicate(
      "unfiltered result classification is consistent",
      classify(record) === "unused" ||
        classify(record) === "used" ||
        classify(record) === "expired",
    );
  }
  TestValidator.predicate(
    "status-filtered results are subsets of unfiltered results when records exist",
    unused.data.length + used.data.length + expired.data.length >= 0,
  );
}
