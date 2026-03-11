import api from "@ORGANIZATION/PROJECT-api";
import type { IAuthorizationToken } from "@ORGANIZATION/PROJECT-api/lib/structures/IAuthorizationToken";
import type { IDiscussionBoardArticleTag } from "@ORGANIZATION/PROJECT-api/lib/structures/IDiscussionBoardArticleTag";
import type { IDiscussionBoardSuperAdmin } from "@ORGANIZATION/PROJECT-api/lib/structures/IDiscussionBoardSuperAdmin";
import { IEntity } from "@ORGANIZATION/PROJECT-api/lib/structures/IEntity";
import { DeepPartial } from "@ORGANIZATION/PROJECT-api/lib/typings/DeepPartial";
import { ArrayUtil, RandomGenerator, TestValidator } from "@nestia/e2e";
import { IConnection } from "@nestia/fetcher";
import { randint } from "tstl";
import typia, { tags } from "typia";

import { authorize_super_admin_join } from "../../../authorize/authorize_super_admin_join";
import { authorize_super_admin_login } from "../../../authorize/authorize_super_admin_login";
import { authorize_super_admin_refresh } from "../../../authorize/authorize_super_admin_refresh";

export async function test_api_duplication_validation_unique_values(
  connection: api.IConnection,
): Promise<void> {
  // Create super admin connection
  const superAdminConnection: api.IConnection = { host: connection.host };
  // Authenticate as super administrator using utility function
  const authResult = await authorize_super_admin_join(superAdminConnection, {
    body: {
      email: typia.random<string & tags.Format<"email">>(),
      password: RandomGenerator.alphaNumeric(16),
    } satisfies IDiscussionBoardSuperAdmin.IJoin,
  });
  typia.assert(authResult);
  // Test 1: Validate unique display name (non-existent)
  const uniqueDisplayName = RandomGenerator.name(2);
  const validation1 =
    await api.functional.discussionBoard.superAdmin.duplication.validate(
      superAdminConnection,
      {
        body: {
          search: uniqueDisplayName,
        } satisfies IDiscussionBoardArticleTag.IRequest,
      },
    );
  typia.assert(validation1);
  TestValidator.equals(
    "unique display name should not be duplicate",
    validation1.isDuplicate,
    false,
  );
  // Test 2: Validate unique section topic (non-existent)
  const uniqueSectionTopic = RandomGenerator.paragraph({ sentences: 1 });
  const validation2 =
    await api.functional.discussionBoard.superAdmin.duplication.validate(
      superAdminConnection,
      {
        body: {
          search: uniqueSectionTopic,
        } satisfies IDiscussionBoardArticleTag.IRequest,
      },
    );
  typia.assert(validation2);
  TestValidator.equals(
    "unique section topic should not be duplicate",
    validation2.isDuplicate,
    false,
  );
  // Test 3: Case-insensitive validation test with generated mixed case data
  const mixedCaseName =
    RandomGenerator.alphabets(5) +
    RandomGenerator.alphabets(5).toUpperCase() +
    RandomGenerator.alphabets(5);
  const validation3 =
    await api.functional.discussionBoard.superAdmin.duplication.validate(
      superAdminConnection,
      {
        body: {
          search: mixedCaseName,
        } satisfies IDiscussionBoardArticleTag.IRequest,
      },
    );
  typia.assert(validation3);
  TestValidator.equals(
    "mixed case name should not be duplicate",
    validation3.isDuplicate,
    false,
  );
  // Test 4: Test with pagination parameters
  const validation4 =
    await api.functional.discussionBoard.superAdmin.duplication.validate(
      superAdminConnection,
      {
        body: {
          search: RandomGenerator.name(2),
          page: typia.random<number & tags.Type<"int32"> & tags.Minimum<1>>(),
          limit: typia.random<
            number & tags.Type<"int32"> & tags.Minimum<1> & tags.Maximum<100>
          >(),
        } satisfies IDiscussionBoardArticleTag.IRequest,
      },
    );
  typia.assert(validation4);
  TestValidator.equals(
    "search with pagination should not be duplicate",
    validation4.isDuplicate,
    false,
  );
}
