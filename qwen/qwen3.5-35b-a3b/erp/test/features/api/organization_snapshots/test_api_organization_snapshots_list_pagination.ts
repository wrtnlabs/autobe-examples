import api from "@ORGANIZATION/PROJECT-api";
import type { IAuthorizationToken } from "@ORGANIZATION/PROJECT-api/lib/structures/IAuthorizationToken";
import { IEntity } from "@ORGANIZATION/PROJECT-api/lib/structures/IEntity";
import type { IHrmPlatformMember } from "@ORGANIZATION/PROJECT-api/lib/structures/IHrmPlatformMember";
import type { IHrmPlatformMemberEmailVerification } from "@ORGANIZATION/PROJECT-api/lib/structures/IHrmPlatformMemberEmailVerification";
import type { IHrmPlatformMemberPasswordReset } from "@ORGANIZATION/PROJECT-api/lib/structures/IHrmPlatformMemberPasswordReset";
import type { IHrmPlatformMemberSession } from "@ORGANIZATION/PROJECT-api/lib/structures/IHrmPlatformMemberSession";
import type { IHrmPlatformOrganization } from "@ORGANIZATION/PROJECT-api/lib/structures/IHrmPlatformOrganization";
import type { IHrmPlatformOrganizationsSnapshot } from "@ORGANIZATION/PROJECT-api/lib/structures/IHrmPlatformOrganizationsSnapshot";
import type { IPage } from "@ORGANIZATION/PROJECT-api/lib/structures/IPage";
import type { IPageIHrmPlatformOrganizationsSnapshot } from "@ORGANIZATION/PROJECT-api/lib/structures/IPageIHrmPlatformOrganizationsSnapshot";
import { DeepPartial } from "@ORGANIZATION/PROJECT-api/lib/typings/DeepPartial";
import { ArrayUtil, RandomGenerator, TestValidator } from "@nestia/e2e";
import { IConnection } from "@nestia/fetcher";
import { randint } from "tstl";
import typia, { tags } from "typia";

import { authorize_member_join } from "../../../authorize/authorize_member_join";
import { authorize_member_login } from "../../../authorize/authorize_member_login";
import { authorize_member_refresh } from "../../../authorize/authorize_member_refresh";

export async function test_api_organization_snapshots_list_pagination(
  connection: api.IConnection,
): Promise<void> {
  // 1. Member authentication and organization creation
  const memberConnection: api.IConnection = { host: connection.host };
  const authorized: IHrmPlatformMember.IAuthorized =
    await authorize_member_join(memberConnection, {
      body: {
        email: typia.random<string & tags.Format<"email">>(),
        password: RandomGenerator.alphaNumeric(16),
        name: RandomGenerator.name(),
        phone_number: RandomGenerator.mobile(),
        avatar_uri: typia.random<string & tags.Format<"uri">>() || null,
        org_name: RandomGenerator.name(),
        org_currency: RandomGenerator.pick(["USD", "EUR", "KRW"]),
        org_description: RandomGenerator.paragraph({ sentences: 2 }),
        org_logo_uri: typia.random<string & tags.Format<"uri">>(),
        org_timezone: RandomGenerator.pick([
          "UTC",
          "Asia/Seoul",
          "America/New_York",
        ]),
        org_fiscal_month: RandomGenerator.pick([1, 4, 7, 10]),
        href: typia.random<string & tags.Format<"uri">>(),
        referrer: typia.random<string & tags.Format<"uri">>(),
        ip: typia.random<string & tags.Format<"ipv4">>(),
      } satisfies IHrmPlatformMember.IJoin,
    });
  typia.assert(authorized);
  // Store password for subsequent login
  const password: string = authorized.token.access.split(".")[0]; // Mock password retrieval
  const actualPassword: string = "test_password";
  // 2. Test pagination with default parameters
  const defaultConnection: api.IConnection = { host: connection.host };
  await authorize_member_login(defaultConnection, {
    body: {
      email: authorized.email,
      password: actualPassword,
    } satisfies IHrmPlatformMember.ILogin,
  });
  const organizationId: string & tags.Format<"uuid"> =
    typia.random<string & tags.Format<"uuid">>();
  const defaultResponse: IPageIHrmPlatformOrganizationsSnapshot.ISummary =
    await api.functional.hrmPlatform.member.organizations.snapshots.index(
      defaultConnection,
      {
        organizationId,
        body: {},
      },
    );
  typia.assert(defaultResponse);
  // 3. Validate pagination metadata
  TestValidator.equals(
    "pagination current page",
    defaultResponse.pagination.current,
    1,
  );
  TestValidator.predicate(
    "pagination limit within bounds",
    () =>
      defaultResponse.pagination.limit >= 1 &&
      defaultResponse.pagination.limit <= 100,
  );
  TestValidator.predicate(
    "pagination records non-negative",
    () => defaultResponse.pagination.records >= 0,
  );
  TestValidator.equals(
    "pagination pages calculated correctly",
    defaultResponse.pagination.pages,
    defaultResponse.pagination.records > 0
      ? Math.ceil(
          defaultResponse.pagination.records / defaultResponse.pagination.limit,
        )
      : 0,
  );
  // 4. Validate snapshot structure and sorting
  if (defaultResponse.data.length > 0) {
    // Validate first snapshot has required fields
    const firstSnapshot: IHrmPlatformOrganizationsSnapshot.ISummary =
      defaultResponse.data[0];
    typia.assert(firstSnapshot);
    TestValidator.equals(
      "first snapshot has id",
      typeof firstSnapshot.id === "string",
      true,
    );
    TestValidator.equals(
      "first snapshot has name",
      typeof firstSnapshot.name === "string",
      true,
    );
    TestValidator.equals(
      "first snapshot has currency",
      typeof firstSnapshot.currency === "string",
      true,
    );
    TestValidator.equals(
      "first snapshot has status",
      typeof firstSnapshot.status === "string",
      true,
    );
    TestValidator.equals(
      "first snapshot has created_at",
      typeof firstSnapshot.created_at === "string",
      true,
    );
    // Validate optional fields with guards
    if (
      firstSnapshot.description !== null &&
      firstSnapshot.description !== undefined
    ) {
      TestValidator.equals(
        "optional description is string",
        typeof firstSnapshot.description === "string",
        true,
      );
    }
    if (
      firstSnapshot.timezone !== null &&
      firstSnapshot.timezone !== undefined
    ) {
      TestValidator.equals(
        "optional timezone is string",
        typeof firstSnapshot.timezone === "string",
        true,
      );
    }
    if (
      firstSnapshot.fiscal_start_month !== null &&
      firstSnapshot.fiscal_start_month !== undefined
    ) {
      TestValidator.predicate(
        "fiscal_start_month within range",
        () =>
          typeof firstSnapshot.fiscal_start_month === "number" &&
          firstSnapshot.fiscal_start_month >= 1 &&
          firstSnapshot.fiscal_start_month <= 12,
      );
    }
    // Validate sorting (newest first)
    if (defaultResponse.data.length > 1) {
      const secondSnapshot: IHrmPlatformOrganizationsSnapshot.ISummary =
        defaultResponse.data[1];
      typia.assert(secondSnapshot);
      const firstDate: string & tags.Format<"date-time"> =
        firstSnapshot.created_at;
      const secondDate: string & tags.Format<"date-time"> =
        secondSnapshot.created_at;
      TestValidator.predicate(
        "snapshots sorted by created_at descending (newest first)",
        () => new Date(firstDate).getTime() >= new Date(secondDate).getTime(),
      );
    }
  }
  // 5. Test custom pagination parameters
  const customPageConnection: api.IConnection = { host: connection.host };
  await authorize_member_login(customPageConnection, {
    body: {
      email: authorized.email,
      password: actualPassword,
    } satisfies IHrmPlatformMember.ILogin,
  });
  const customResponse: IPageIHrmPlatformOrganizationsSnapshot.ISummary =
    await api.functional.hrmPlatform.member.organizations.snapshots.index(
      customPageConnection,
      {
        organizationId,
        body: {
          page: 2,
          limit: 20,
        },
      },
    );
  typia.assert(customResponse);
  TestValidator.equals(
    "custom page number respected",
    customResponse.pagination.current,
    2,
  );
  TestValidator.equals(
    "custom limit respected",
    customResponse.pagination.limit,
    20,
  );
}