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

export async function test_api_member_password_resets_search_summary(
  connection: api.IConnection,
): Promise<void> {
  const memberConnection: api.IConnection = { host: connection.host };
  const authorized = await authorize_member_join(memberConnection, {
    body: {
      email: typia.random<string & tags.Format<"email">>(),
      password: RandomGenerator.alphaNumeric(12),
      displayName: RandomGenerator.name(),
      avatarImageUrl: null,
      phoneNumber: null,
      href: "https://example.com/onboarding",
      referrer: "https://example.com/landing",
      ip: undefined,
    } satisfies IErpHrmTimeMember.IJoin,
  });
  typia.assert(authorized);
  const request = {
    page: 1,
    limit: 10,
    sort: "createdAtDesc",
  } satisfies IErpHrmTimeMemberPasswordReset.IRequest;
  const page = await api.functional.erpHrmTime.member.passwordResets.index(
    memberConnection,
    {
      body: request,
    },
  );
  typia.assert(page);
  TestValidator.equals(
    "pagination current page should match request",
    page.pagination.current,
    request.page,
  );
  TestValidator.equals(
    "pagination limit should match request",
    page.pagination.limit,
    request.limit,
  );
  TestValidator.predicate(
    "pagination records should be non-negative",
    page.pagination.records >= 0,
  );
  TestValidator.predicate(
    "pagination pages should be non-negative",
    page.pagination.pages >= 0,
  );
  TestValidator.equals(
    "pagination pages should match total records and limit",
    page.pagination.pages,
    page.pagination.limit > 0
      ? Math.ceil(page.pagination.records / page.pagination.limit)
      : 0,
  );
  TestValidator.predicate(
    "page data length should not exceed limit",
    page.data.length <= page.pagination.limit,
  );
  TestValidator.predicate(
    "returned rows should respect total records",
    page.pagination.records >= page.data.length,
  );
  for (const item of page.data) {
    typia.assert(item);
    TestValidator.predicate(
      "password reset summary should not expose token",
      !Object.prototype.hasOwnProperty.call(item, "token"),
    );
    TestValidator.predicate(
      "password reset summary should include member summary",
      item.member !== null && item.member !== undefined,
    );
    TestValidator.predicate(
      "password reset summary should include lifecycle metadata",
      item.expiresAt !== null &&
        item.createdAt !== null &&
        item.updatedAt !== null &&
        item.deletedAt !== undefined,
    );
  }
  for (let i = 1; i < page.data.length; i += 1) {
    TestValidator.predicate(
      "default ordering should be newest first",
      new Date(page.data[i - 1].createdAt).getTime() >=
        new Date(page.data[i].createdAt).getTime(),
    );
  }
  const byMember = await api.functional.erpHrmTime.member.passwordResets.index(
    memberConnection,
    {
      body: {
        ...request,
        erpHrmTimeMemberId: authorized.id,
      } satisfies IErpHrmTimeMemberPasswordReset.IRequest,
    },
  );
  typia.assert(byMember);
  TestValidator.predicate(
    "member-filtered search should return valid summaries",
    byMember.data.every(
      (item) => item.member !== null && item.member !== undefined,
    ),
  );
  const byStatus = await api.functional.erpHrmTime.member.passwordResets.index(
    memberConnection,
    {
      body: {
        ...request,
        status: "unused",
      } satisfies IErpHrmTimeMemberPasswordReset.IRequest,
    },
  );
  typia.assert(byStatus);
  TestValidator.predicate(
    "status-filtered search should return paginated results",
    byStatus.pagination.pages >= 0,
  );
  const byCreatedRange =
    await api.functional.erpHrmTime.member.passwordResets.index(
      memberConnection,
      {
        body: {
          ...request,
          createdAt: {
            from: "2000-01-01T00:00:00.000Z",
            to: "2100-01-01T00:00:00.000Z",
          },
        } satisfies IErpHrmTimeMemberPasswordReset.IRequest,
      },
    );
  typia.assert(byCreatedRange);
  TestValidator.predicate(
    "createdAt range search should return a valid page",
    byCreatedRange.pagination.pages >= 0,
  );
  const byExpiresRange =
    await api.functional.erpHrmTime.member.passwordResets.index(
      memberConnection,
      {
        body: {
          ...request,
          expiresAt: {
            from: "2000-01-01T00:00:00.000Z",
            to: "2100-01-01T00:00:00.000Z",
          },
        } satisfies IErpHrmTimeMemberPasswordReset.IRequest,
      },
    );
  typia.assert(byExpiresRange);
  TestValidator.predicate(
    "expiresAt range search should return a valid page",
    byExpiresRange.pagination.pages >= 0,
  );
  const byToken = await api.functional.erpHrmTime.member.passwordResets.index(
    memberConnection,
    {
      body: {
        ...request,
        token: "known-token",
      } satisfies IErpHrmTimeMemberPasswordReset.IRequest,
    },
  );
  typia.assert(byToken);
  TestValidator.predicate(
    "token lookup should still redact token field",
    byToken.data.every(
      (item) => !Object.prototype.hasOwnProperty.call(item, "token"),
    ),
  );
}
