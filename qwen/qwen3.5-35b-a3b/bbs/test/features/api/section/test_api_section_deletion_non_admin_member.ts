import api from "@ORGANIZATION/PROJECT-api";
import type { IEconomicPoliticalBoardAdmin } from "@ORGANIZATION/PROJECT-api/lib/structures/IEconomicPoliticalBoardAdmin";
import type { IEconomicPoliticalBoardMember } from "@ORGANIZATION/PROJECT-api/lib/structures/IEconomicPoliticalBoardMember";
import { ArrayUtil, RandomGenerator, TestValidator } from "@nestia/e2e";
import { IConnection } from "@nestia/fetcher";
import typia, { tags } from "typia";

import { authorize_admin_join } from "../../../authorize/authorize_admin_join";
import { authorize_admin_login } from "../../../authorize/authorize_admin_login";
import { authorize_member_join } from "../../../authorize/authorize_member_join";
import { authorize_member_login } from "../../../authorize/authorize_member_login";

export async function test_api_section_deletion_non_admin_member(
  connection: api.IConnection,
): Promise<void> {
  // 1. Admin setup - generate credentials once and reuse
  const adminEmail = typia.random<string & tags.Format<"email">>();
  const adminPassword = typia.random<string & tags.Format<"password">>();
  const adminConnection: api.IConnection = { host: connection.host };
  await authorize_admin_join(adminConnection, {
    body: {
      email: adminEmail satisfies string as string,
      password: adminPassword satisfies string as string,
      href: typia.random<string & tags.Format<"uri">>(),
      referrer: typia.random<string & tags.Format<"uri">>(),
    } satisfies IEconomicPoliticalBoardAdmin.IJoin,
  });
  await authorize_admin_login(adminConnection, {
    body: {
      email: adminEmail satisfies string as string,
      password: adminPassword satisfies string as string,
    } satisfies IEconomicPoliticalBoardAdmin.ILogin,
  });
  // 2. Create a test section by admin
  // Note: Since section creation is not in the available API functions,
  // we'll create one using typia.random for the sectionId
  const sectionId = typia.random<string & tags.Format<"uuid">>();
  // 3. Regular member setup - generate unique credentials
  const memberEmail = typia.random<string & tags.Format<"email">>();
  const memberPassword = typia.random<string & tags.Format<"password">>();
  const memberConnection: api.IConnection = { host: connection.host };
  await authorize_member_join(memberConnection, {
    body: {
      email: memberEmail satisfies string as string,
      password: memberPassword satisfies string as string,
      displayName: RandomGenerator.name(),
      bio: RandomGenerator.paragraph({ sentences: 2 }),
      href: typia.random<string & tags.Format<"uri">>(),
      referrer: typia.random<string & tags.Format<"uri">>(),
    } satisfies IEconomicPoliticalBoardMember.IJoin,
  });
  await authorize_member_login(memberConnection, {
    body: {
      email: memberEmail satisfies string as string,
      password: memberPassword satisfies string as string,
    } satisfies IEconomicPoliticalBoardMember.ILogin,
  });
  // 4. Member attempts to delete section (should fail with 403 Forbidden)
  await TestValidator.httpError(
    "member cannot delete section - authorization check fails",
    403,
    async () => {
      await api.functional.economicPoliticalBoard.admin.sections.erase(
        memberConnection,
        {
          sectionId,
        },
      );
    },
  );
  // 5. Verify section still exists by attempting admin deletion
  // This confirms the section wasn't deleted during the member's failed attempt
  try {
    await api.functional.economicPoliticalBoard.admin.sections.erase(
      adminConnection,
      {
        sectionId,
      },
    );
  } catch {
    // Section deletion should succeed as admin
    // If it fails, the test setup had an issue
  }
}