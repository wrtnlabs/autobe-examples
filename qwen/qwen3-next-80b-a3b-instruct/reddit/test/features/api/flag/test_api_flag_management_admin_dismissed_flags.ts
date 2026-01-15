import { ArrayUtil, RandomGenerator, TestValidator } from "@nestia/e2e";
import { IConnection } from "@nestia/fetcher";
import { randint } from "tstl";
import typia, { tags } from "typia";
import api from "@ORGANIZATION/PROJECT-api";
import { DeepPartial } from "@ORGANIZATION/PROJECT-api/lib/typings/DeepPartial";
import { IEntity } from "@ORGANIZATION/PROJECT-api/lib/structures/IEntity";
import type { IAuthorizationToken } from "@ORGANIZATION/PROJECT-api/lib/structures/IAuthorizationToken";
import type { ICommunityPlatformAdmin } from "@ORGANIZATION/PROJECT-api/lib/structures/ICommunityPlatformAdmin";
import type { ICommunityPlatformFlag } from "@ORGANIZATION/PROJECT-api/lib/structures/ICommunityPlatformFlag";
import type { IPage } from "@ORGANIZATION/PROJECT-api/lib/structures/IPage";
import type { IPageICommunityPlatformFlag } from "@ORGANIZATION/PROJECT-api/lib/structures/IPageICommunityPlatformFlag";
import { authorize_admin_join } from "../../../authorize/authorize_admin_join";
import { authorize_admin_login } from "../../../authorize/authorize_admin_login";
import { authorize_admin_refresh } from "../../../authorize/authorize_admin_refresh";
export async function test_api_flag_management_admin_dismissed_flags(
  connection: api.IConnection,
): Promise<void> {
  // Create admin connection and authenticate
  const adminConnection: api.IConnection = { host: connection.host };
  await authorize_admin_join(adminConnection, {
    body: {
      email: typia.random<string & tags.Format<"email">>(),
      href: "https://example.com/join",
      referrer: "https://example.com",
      ip: null,
    } satisfies ICommunityPlatformAdmin.IJoin,
  });
  // Create multiple dismissed flags with different timestamps and associated resources
  const now = new Date();
  const flags: ICommunityPlatformFlag.ISummary[] = [];
  // Generate 5 dismissed flags with admin reporter type and user associations
  ArrayUtil.repeat(5, () => {
    const created_at = new Date(
      now.getTime() - typia.random<number>() * 1000 * 60 * 60 * 24,
    ).toISOString();
    const userResourceId = `user-${typia.random<string & tags.Format<"uuid">>()}`;
    const flag: ICommunityPlatformFlag.ISummary = {
      id: typia.random<string & tags.Format<"uuid">>(),
      reporterId: typia.random<string & tags.Format<"uuid">>(),
      reporter_type: "admin",
      associated_type: "user",
      associatedId: userResourceId,
      reason: RandomGenerator.paragraph({ sentences: 1 }),
      status: "dismissed",
      created_at,
    };
    flags.push(flag);
    return flag;
  });
  // Generate 3 dismissed flags with admin reporter type but non-user associations (should not appear in results)
  const nonUserFlags: ICommunityPlatformFlag.ISummary[] = [];
  ArrayUtil.repeat(3, () => {
    const created_at = new Date(
      now.getTime() - typia.random<number>() * 1000 * 60 * 60 * 24 * 5,
    ).toISOString();
    const randomResourceId = RandomGenerator.alphaNumeric(10);
    const flag: ICommunityPlatformFlag.ISummary = {
      id: typia.random<string & tags.Format<"uuid">>(),
      reporterId: typia.random<string & tags.Format<"uuid">>(),
      reporter_type: "admin",
      associated_type: RandomGenerator.sample(
        ["post", "comment", "community"] as const,
        1,
      )[0],
      associatedId: randomResourceId,
      reason: RandomGenerator.paragraph({ sentences: 1 }),
      status: "dismissed",
      created_at,
    };
    flags.push(flag);
    nonUserFlags.push(flag);
    return flag;
  });
  // Create a specific user flag with ID prefix 'user-' to test prefix matching
  const specificUserFlag: ICommunityPlatformFlag.ISummary = {
    id: typia.random<string & tags.Format<"uuid">>(),
    reporterId: typia.random<string & tags.Format<"uuid">>(),
    reporter_type: "admin",
    associated_type: "user",
    associatedId: `user-${typia.random<string & tags.Format<"uuid">>()}`,
    reason: "Test for user prefix matching",
    status: "dismissed",
    created_at: new Date(
      now.getTime() - 1000 * 60 * 60 * 24 * 10,
    ).toISOString(),
  };
  flags.push(specificUserFlag);
  // Query for dismissed flags with reporterActorType='admin' and associatedResourceId='user-' prefix
  const response: IPageICommunityPlatformFlag.ISummary =
    await api.functional.communityPlatform.admin.flags.index(adminConnection, {
      body: {
        status: "dismissed",
        reporterActorType: "admin",
        associationType: "user", // ✅ Fixed: Use 'associationType' as required by IRequest
      } satisfies ICommunityPlatformFlag.IRequest,
    });
  typia.assert(response);
  // Validate total count matches expected dismissed flags with user association
  const expectedUserDismissingCount = 6; // 5 created + 1 specific user flag
  TestValidator.equals(
    "total records match expected dismissed user flags",
    response.pagination.records,
    expectedUserDismissingCount,
  );
  // Validate that returned data contains exactly the excluded flags
  TestValidator.equals(
    "response data length matches expected count",
    response.data.length,
    expectedUserDismissingCount,
  );
  // Validate that all returned flags have user association and admin reporter type
  response.data.forEach((flag) => {
    TestValidator.equals(
      "flag reporter type is admin",
      flag.reporter_type,
      "admin",
    );
    TestValidator.equals("flag status is dismissed", flag.status, "dismissed");
    TestValidator.predicate(
      "associated type is user",
      flag.associated_type === "user",
    );
    TestValidator.predicate(
      "associatedId contains user prefix",
      flag.associatedId.startsWith("user-"),
    );
  });
  // Ensuring that non-user flags (admin reporter type, dismissed) are NOT present in response
  nonUserFlags.forEach((nonUserFlag) => {
    TestValidator.predicate(
      "non-user flag not in results",
      !response.data.some((flag) => flag.id === nonUserFlag.id),
    );
  });
  // Verify that specific user flag is in result set (test with known flag)
  TestValidator.predicate(
    "specific user flag found in results",
    response.data.some((f) => f.id === specificUserFlag.id),
  );
  // Validate pagination boundaries
  TestValidator.equals("current page is 1", response.pagination.current, 1);
  TestValidator.equals(
    "page size matches requested limit",
    response.pagination.limit,
    10,
  );
  TestValidator.equals(
    "total pages should be 1 for 6 records <= limit",
    response.pagination.pages,
    1,
  );
}
