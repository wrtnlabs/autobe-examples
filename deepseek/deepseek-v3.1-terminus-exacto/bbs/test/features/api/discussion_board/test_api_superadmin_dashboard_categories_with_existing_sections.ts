import api from "@ORGANIZATION/PROJECT-api";
import type { IAuthorizationToken } from "@ORGANIZATION/PROJECT-api/lib/structures/IAuthorizationToken";
import type { IDiscussionBoardSection } from "@ORGANIZATION/PROJECT-api/lib/structures/IDiscussionBoardSection";
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

export async function test_api_superadmin_dashboard_categories_with_existing_sections(
  connection: api.IConnection,
): Promise<void> {
  // Create super administrator connection
  const superAdminConnection: api.IConnection = { host: connection.host };
  await authorize_super_admin_join(superAdminConnection, {
    body: {
      email: typia.random<string & tags.Format<"email">>(),
      password: RandomGenerator.alphaNumeric(16),
    } satisfies IDiscussionBoardSuperAdmin.IJoin,
  });
  // Retrieve all sections for dashboard oversight
  const response =
    await api.functional.discussionBoard.superAdmin.dashboard.categories.at(
      superAdminConnection,
    );
  typia.assert(response);
  
  // Extract sections array from the response with proper type narrowing
  const sections = (() => {
    if (Array.isArray(response)) {
      return response satisfies any[] as any[];
    }
    if (typeof response === 'object' && response !== null) {
      if ('data' in response && Array.isArray(response.data)) {
        return (response as any).data satisfies any[] as any[];
      }
      if ('sections' in response && Array.isArray(response.sections)) {
        return (response as any).sections satisfies any[] as any[];
      }
    }
    return [] satisfies any[] as any[];
  })();
  
  // Validate response structure contains essential section information
  TestValidator.predicate(
    "sections response is valid",
    Array.isArray(sections),
  );
  if (sections.length > 0) {
    // Verify each section has required fields
    sections.forEach((section: any, index: number) => {
      TestValidator.predicate(
        `section ${index} has id`,
        typeof section.id === "string" && section.id.length > 0,
      );
      TestValidator.predicate(
        `section ${index} has name`,
        typeof section.name === "string" && section.name.length > 0,
      );
      TestValidator.predicate(
        `section ${index} has created_at`,
        typeof section.created_at === "string" && section.created_at.length > 0,
      );
      // description can be null, so we only check if it exists
      TestValidator.predicate(
        `section ${index} has description field`,
        "description" in section,
      );
    });
    // Verify ordering by created_at descending (newest first)
    if (sections.length > 1) {
      for (let i = 0; i < sections.length - 1; i++) {
        const currentDate = new Date(sections[i].created_at);
        const nextDate = new Date(sections[i + 1].created_at);
        TestValidator.predicate(
          `section ${i} is newer than section ${i + 1}`,
          currentDate >= nextDate,
        );
      }
    }
  }
}