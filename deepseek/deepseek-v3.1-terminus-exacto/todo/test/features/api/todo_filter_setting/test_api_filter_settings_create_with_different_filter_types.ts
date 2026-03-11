import api from "@ORGANIZATION/PROJECT-api";
import type { IAuthorizationToken } from "@ORGANIZATION/PROJECT-api/lib/structures/IAuthorizationToken";
import { IEntity } from "@ORGANIZATION/PROJECT-api/lib/structures/IEntity";
import type { IMultiUserTodoMember } from "@ORGANIZATION/PROJECT-api/lib/structures/IMultiUserTodoMember";
import type { IMultiUserTodoTodoFilterSetting } from "@ORGANIZATION/PROJECT-api/lib/structures/IMultiUserTodoTodoFilterSetting";
import { DeepPartial } from "@ORGANIZATION/PROJECT-api/lib/typings/DeepPartial";
import { ArrayUtil, RandomGenerator, TestValidator } from "@nestia/e2e";
import { IConnection } from "@nestia/fetcher";
import { randint } from "tstl";
import typia, { tags } from "typia";

import { authorize_member_join } from "../../../authorize/authorize_member_join";
import { authorize_member_login } from "../../../authorize/authorize_member_login";
import { authorize_member_refresh } from "../../../authorize/authorize_member_refresh";
import { generate_random_multi_user_todo_member_filter_settings_create } from "../../../generate/generate_random_multi_user_todo_member_filter_settings_create";
import { prepare_random_multi_user_todo_todo_filter_setting } from "../../../prepare/prepare_random_multi_user_todo_todo_filter_setting";

export async function test_api_filter_settings_create_with_different_filter_types(
  connection: api.IConnection,
): Promise<void> {
  // 1. Authenticate member
  const memberConnection: api.IConnection = { host: connection.host };
  const member = await authorize_member_join(memberConnection, {
    body: {
      email: typia.random<string & tags.Format<"email">>(),
      password: RandomGenerator.alphaNumeric(16),
      display_name: RandomGenerator.name(),
      href: typia.random<string & tags.Format<"uri">>(),
      referrer: typia.random<string & tags.Format<"uri">>(),
      ip: typia.random<string & tags.Format<"ipv4">>(),
    },
  });
  typia.assert(member);
  // Define test filter types
  const filterTypes = [
    "completion_status",
    "date_range",
    "priority",
    "category",
    "tag",
  ] as const;
  const createdFilters: IMultiUserTodoTodoFilterSetting[] = [];
  // 2. Create filter settings with different filter types
  for (const filterType of filterTypes) {
    const filter =
      await generate_random_multi_user_todo_member_filter_settings_create(
        memberConnection,
        {
          body: {
            name: `Filter for ${filterType}`,
            filter_type: filterType,
            is_default: false,
          },
        },
      );
    typia.assert(filter);
    // Validate response
    TestValidator.equals(
      `filter_type matches for ${filterType}`,
      filter.filter_type,
      filterType,
    );
    TestValidator.equals(
      `is_default false for ${filterType}`,
      filter.is_default,
      false,
    );
    TestValidator.equals(`member matches creator`, filter.member.id, member.id);
    createdFilters.push(filter);
  }
  // 3. Test default filter logic
  // Create first default filter
  const firstDefault =
    await generate_random_multi_user_todo_member_filter_settings_create(
      memberConnection,
      {
        body: {
          name: "Default Filter 1",
          filter_type: "completion_status",
          is_default: true,
        },
      },
    );
  typia.assert(firstDefault);
  TestValidator.equals(
    "first default is_default true",
    firstDefault.is_default,
    true,
  );
  TestValidator.equals(
    "first default filter_type",
    firstDefault.filter_type,
    "completion_status",
  );
  // Create second default filter
  const secondDefault =
    await generate_random_multi_user_todo_member_filter_settings_create(
      memberConnection,
      {
        body: {
          name: "Default Filter 2",
          filter_type: "date_range",
          is_default: true,
        },
      },
    );
  typia.assert(secondDefault);
  TestValidator.equals(
    "second default is_default true",
    secondDefault.is_default,
    true,
  );
  TestValidator.equals(
    "second default filter_type",
    secondDefault.filter_type,
    "date_range",
  );
  // Verify both have is_default: true (system should handle multiple defaults)
  TestValidator.equals(
    "first default remains true",
    firstDefault.is_default,
    true,
  );
  TestValidator.equals(
    "second default is true",
    secondDefault.is_default,
    true,
  );
  // 4. Test business error - duplicate name within same member
  const duplicateName = "Unique Filter Name";
  // First creation with unique name should succeed
  const uniqueFilter =
    await generate_random_multi_user_todo_member_filter_settings_create(
      memberConnection,
      {
        body: {
          name: duplicateName,
          filter_type: "priority",
          is_default: false,
        },
      },
    );
  typia.assert(uniqueFilter);
  // Second creation with same name should error (business logic validation)
  await TestValidator.error("duplicate filter name", async () => {
    await generate_random_multi_user_todo_member_filter_settings_create(
      memberConnection,
      {
        body: {
          name: duplicateName,
          filter_type: "category",
          is_default: false,
        },
      },
    );
  });
}
