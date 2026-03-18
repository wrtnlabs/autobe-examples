import api from "@ORGANIZATION/PROJECT-api";
import type { IAuthorizationToken } from "@ORGANIZATION/PROJECT-api/lib/structures/IAuthorizationToken";
import { IEntity } from "@ORGANIZATION/PROJECT-api/lib/structures/IEntity";
import type { IErpHrmTimeTrackingDepartment } from "@ORGANIZATION/PROJECT-api/lib/structures/IErpHrmTimeTrackingDepartment";
import type { IErpHrmTimeTrackingMember } from "@ORGANIZATION/PROJECT-api/lib/structures/IErpHrmTimeTrackingMember";
import { DeepPartial } from "@ORGANIZATION/PROJECT-api/lib/typings/DeepPartial";
import { ArrayUtil, RandomGenerator, TestValidator } from "@nestia/e2e";
import { IConnection } from "@nestia/fetcher";
import { randint } from "tstl";
import typia, { tags } from "typia";

import { authorize_member_join } from "../../../authorize/authorize_member_join";
import { authorize_member_login } from "../../../authorize/authorize_member_login";
import { authorize_member_refresh } from "../../../authorize/authorize_member_refresh";

export async function test_api_department_tree_nested_hierarchy_success(
  connection: api.IConnection,
): Promise<void> {
  // 1) Authenticate as a member and establish organization context
  const memberConnection: api.IConnection = { host: connection.host };
  const joinCredentials = {
    email: typia.random<string & tags.Format<"email">>(),
    password: "Password123!",
    organizationName: RandomGenerator.name(),
    organizationDescription: RandomGenerator.paragraph({ sentences: 1 }),
    organizationLogoUrl: null,
    organizationCurrencyCode: "USD",
    organizationTimezone: "Asia/Seoul",
    organizationFiscalStartMonth: 6,
    href: "https://example.com/join",
    referrer: "https://example.com/referrer",
    ip: null,
  } satisfies IErpHrmTimeTrackingMember.IJoin;
  const authorized = await authorize_member_join(memberConnection, {
    body: joinCredentials,
  });
  typia.assert(authorized);
  // 2) Retrieve department hierarchy tree
  const tree =
    await api.functional.erpHrmTimeTracking.member.departments.tree.at(
      memberConnection,
    );
  typia.assert(tree);
  // 3) Validate hierarchical shape and presence of nested relationship
  const nodesToVisit: IErpHrmTimeTrackingDepartment.IInvert[] = [tree];
  let foundChildRelationship = false;
  while (nodesToVisit.length > 0) {
    const node = nodesToVisit.shift()!;
    const children = node.children;
    if (children.length > 0) {
      foundChildRelationship = true;
      for (const child of children) {
        TestValidator.notEquals(
          "child id differs from parent id",
          child.id,
          node.id,
        );
      }
      nodesToVisit.push(...children);
    }
    // deleted_at is validated by typia.assert(tree)
  }
  TestValidator.predicate(
    "should have at least one parent-child relationship in the tree",
    () => foundChildRelationship,
  );
  // 4) Basic organization-context stability check for the same authenticated member
  const tree2 =
    await api.functional.erpHrmTimeTracking.member.departments.tree.at(
      memberConnection,
    );
  typia.assert(tree2);
  TestValidator.equals(
    "tree root id stable for same organization context",
    tree2.id,
    tree.id,
  );
}
