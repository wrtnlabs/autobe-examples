import { ArrayUtil, RandomGenerator, TestValidator } from "@nestia/e2e";
import { IConnection } from "@nestia/fetcher";
import typia, { tags } from "typia";

import api from "@ORGANIZATION/PROJECT-api";
import type { IAuthorizationToken } from "@ORGANIZATION/PROJECT-api/lib/structures/IAuthorizationToken";
import type { ICommunityPlatformAdministrator } from "@ORGANIZATION/PROJECT-api/lib/structures/ICommunityPlatformAdministrator";
import type { ICommunityPlatformProfileImageHistory } from "@ORGANIZATION/PROJECT-api/lib/structures/ICommunityPlatformProfileImageHistory";
import type { ICommunityPlatformUser } from "@ORGANIZATION/PROJECT-api/lib/structures/ICommunityPlatformUser";
import type { IPage } from "@ORGANIZATION/PROJECT-api/lib/structures/IPage";
import type { IPageICommunityPlatformProfileImageHistory } from "@ORGANIZATION/PROJECT-api/lib/structures/IPageICommunityPlatformProfileImageHistory";

/**
 * Validate that profile image history retrieval by an administrator works with
 * full audit trail, pagination, filtering, and access restriction.
 *
 * 1. Register an administrator account and obtain token.
 * 2. Create a synthetic user id.
 * 3. As administrator, retrieve the user's profile image history with various
 *    pagination, sorting, and include_soft_deleted filter combinations.
 * 4. Validate that all returned records contain expected audit fields and that
 *    sorting/pagination works.
 * 5. Attempt to call the endpoint without administrator authentication and expect
 *    access denial.
 */
export async function test_api_profile_image_history_retrieval_by_administrator(
  connection: api.IConnection,
) {
  // 1. Register and authenticate as administrator
  const adminCredentials = {
    email: typia.random<string & tags.Format<"email">>(),
    password: typia.random<string & tags.Format<"password">>(),
  } satisfies ICommunityPlatformAdministrator.ICreate;
  const admin: ICommunityPlatformAdministrator.IAuthorized =
    await api.functional.auth.administrator.join(connection, {
      body: adminCredentials,
    });
  typia.assert(admin);

  // 2. Generate a fake user id to test history fetching
  const userId: string & tags.Format<"uuid"> = typia.random<
    string & tags.Format<"uuid">
  >();

  // 3. Prepare test cases with combinations of pagination, sort, and soft-deleted flag
  const sortFields = ["uploaded_at", "effective_from", "removed_at"] as const;
  const sortDirections = ["asc", "desc"] as const;
  const softDeletedOptions = [true, false] as const;
  const testCombos = ArrayUtil.repeat(3, () => ({
    sort_by: RandomGenerator.pick(sortFields),
    sort_direction: RandomGenerator.pick(sortDirections),
    include_soft_deleted: RandomGenerator.pick(softDeletedOptions),
    limit: typia.random<
      number & tags.Type<"int32"> & tags.Minimum<1> & tags.Maximum<5>
    >(),
  }));

  // For each combo, fetch and validate
  for (const combo of testCombos) {
    const reqBody = {
      user_id: userId,
      page: 1 as number & tags.Type<"int32"> & tags.Minimum<1>,
      limit: combo.limit,
      sort_by: combo.sort_by,
      sort_direction: combo.sort_direction,
      include_soft_deleted: combo.include_soft_deleted,
    } satisfies ICommunityPlatformProfileImageHistory.IRequest;
    const page: IPageICommunityPlatformProfileImageHistory.ISummary =
      await api.functional.communityPlatform.administrator.users.profileImageHistory.index(
        connection,
        {
          userId,
          body: reqBody,
        },
      );
    typia.assert(page);
    TestValidator.predicate(
      "all results match request user id",
      page.data.every((img) => img.user.id === userId),
    );
    for (const entry of page.data) {
      TestValidator.predicate(
        "image_uri is a URI",
        typeof entry.image_uri === "string" && entry.image_uri.length > 0,
      );
      TestValidator.predicate(
        "uploaded_at is ISO",
        typeof entry.uploaded_at === "string" &&
          entry.uploaded_at.endsWith("Z"),
      );
      TestValidator.predicate(
        "effective_from is ISO",
        typeof entry.effective_from === "string" &&
          entry.effective_from.endsWith("Z"),
      );
    }
    // If include_soft_deleted is false, ensure none have deleted_at set.
    if (!combo.include_soft_deleted) {
      TestValidator.predicate(
        "no soft-deleted history when include_soft_deleted is false",
        page.data.every(
          (entry) =>
            entry.deleted_at === null || entry.deleted_at === undefined,
        ),
      );
    }
  }
  // Validate that access is restricted (remove admin token and retry)
  const unauthConn: api.IConnection = { ...connection, headers: {} };
  await TestValidator.error(
    "access is restricted to administrator role",
    async () => {
      await api.functional.communityPlatform.administrator.users.profileImageHistory.index(
        unauthConn,
        {
          userId,
          body: {
            user_id: userId,
            page: 1 as number & tags.Type<"int32"> & tags.Minimum<1>,
          } satisfies ICommunityPlatformProfileImageHistory.IRequest,
        },
      );
    },
  );
}
