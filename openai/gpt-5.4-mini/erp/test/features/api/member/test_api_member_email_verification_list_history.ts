import api from "@ORGANIZATION/PROJECT-api";
import type { IAuthorizationToken } from "@ORGANIZATION/PROJECT-api/lib/structures/IAuthorizationToken";
import { IEntity } from "@ORGANIZATION/PROJECT-api/lib/structures/IEntity";
import type { IErpHrmTimeMember } from "@ORGANIZATION/PROJECT-api/lib/structures/IErpHrmTimeMember";
import type { IErpHrmTimeMemberEmailVerification } from "@ORGANIZATION/PROJECT-api/lib/structures/IErpHrmTimeMemberEmailVerification";
import type { IPage } from "@ORGANIZATION/PROJECT-api/lib/structures/IPage";
import type { IPageIErpHrmTimeMemberEmailVerification } from "@ORGANIZATION/PROJECT-api/lib/structures/IPageIErpHrmTimeMemberEmailVerification";
import { DeepPartial } from "@ORGANIZATION/PROJECT-api/lib/typings/DeepPartial";
import { ArrayUtil, RandomGenerator, TestValidator } from "@nestia/e2e";
import { IConnection } from "@nestia/fetcher";
import { randint } from "tstl";
import typia, { tags } from "typia";

import { authorize_member_join } from "../../../authorize/authorize_member_join";
import { authorize_member_login } from "../../../authorize/authorize_member_login";
import { authorize_member_refresh } from "../../../authorize/authorize_member_refresh";

export async function test_api_member_email_verification_list_history(
  connection: api.IConnection,
): Promise<void> {
  const memberConnection: api.IConnection = { host: connection.host };
  const authorized = await authorize_member_join(memberConnection, {
    body: {
      email: typia.random<string & tags.Format<"email">>(),
      password: "P@ssw0rd1234!",
      displayName: RandomGenerator.name(),
      href: "https://example.com/onboarding",
      referrer: "https://example.com/",
      avatarImageUrl: null,
      phoneNumber: null,
      ip: null,
    } satisfies IErpHrmTimeMember.IJoin,
  });
  typia.assert(authorized);
  const page = 1;
  const limit = 10;
  const response =
    await api.functional.erpHrmTime.member.emailVerifications.index(
      memberConnection,
      {
        body: {
          page,
          limit,
        } satisfies IErpHrmTimeMemberEmailVerification.IRequest,
      },
    );
  typia.assert(response);
  TestValidator.equals(
    "pagination current should match requested page",
    response.pagination.current,
    page,
  );
  TestValidator.equals(
    "pagination limit should match requested limit",
    response.pagination.limit,
    limit,
  );
  TestValidator.predicate(
    "pagination records should be non-negative",
    response.pagination.records >= 0,
  );
  TestValidator.predicate(
    "pagination pages should be non-negative",
    response.pagination.pages >= 0,
  );
  TestValidator.predicate(
    "response data should be an array",
    Array.isArray(response.data),
  );
  for (const item of response.data) {
    typia.assert<IErpHrmTimeMemberEmailVerification.ISummary>(item);
    TestValidator.predicate(
      "summary must not expose raw token fields",
      !Object.keys(item).includes("token"),
    );
    TestValidator.predicate(
      "summary must include an owner reference",
      item.member !== null && item.member !== undefined,
    );
    TestValidator.predicate(
      "verification timestamps must be nullable only through verifiedAt/deletedAt",
      item.verifiedAt === null || typeof item.verifiedAt === "string",
    );
    TestValidator.predicate(
      "deletedAt must be nullable timestamp",
      item.deletedAt === null || typeof item.deletedAt === "string",
    );
  }
  const filtered =
    await api.functional.erpHrmTime.member.emailVerifications.index(
      memberConnection,
      {
        body: {
          page: 1,
          limit: 10,
          deletedAt: null,
        } satisfies IErpHrmTimeMemberEmailVerification.IRequest,
      },
    );
  typia.assert(filtered);
  TestValidator.equals(
    "filtered pagination current should match requested page",
    filtered.pagination.current,
    1,
  );
  TestValidator.equals(
    "filtered pagination limit should match requested limit",
    filtered.pagination.limit,
    10,
  );
  TestValidator.predicate(
    "filtered response should remain summary-only",
    filtered.data.every((item) => !Object.keys(item).includes("token")),
  );
  TestValidator.predicate(
    "filtered response should contain only owned verification summaries",
    filtered.data.every(
      (item) => item.member !== null && item.member !== undefined,
    ),
  );
}
