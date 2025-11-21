import { ArrayUtil, RandomGenerator, TestValidator } from "@nestia/e2e";
import { IConnection } from "@nestia/fetcher";
import typia, { tags } from "typia";

import api from "@ORGANIZATION/PROJECT-api";
import type { IAuthorizationToken } from "@ORGANIZATION/PROJECT-api/lib/structures/IAuthorizationToken";
import type { IShoppingMallAdmin } from "@ORGANIZATION/PROJECT-api/lib/structures/IShoppingMallAdmin";
import type { IShoppingMallChannel } from "@ORGANIZATION/PROJECT-api/lib/structures/IShoppingMallChannel";
import type { IShoppingMallSection } from "@ORGANIZATION/PROJECT-api/lib/structures/IShoppingMallSection";

/**
 * Test section hierarchical navigation including parent-child relationships,
 * nested content organization, and multi-level navigation tree construction.
 *
 * This comprehensive test validates sophisticated content organization within
 * marketplace channel environments, ensuring proper hierarchical structure
 * implementation, display ordering, and channel boundary preservation across
 * the section hierarchical organization system within shopping mall platform
 * ecosystem.
 *
 * Test workflow:
 *
 * 1. Admin authentication setup for hierarchical content management
 * 2. Channel creation for marketplace environment establishment
 * 3. Root-level section creation for foundation hierarchy
 * 4. Parent section establishment for mid-level organization
 * 5. Child section creation under parent relationships
 * 6. Second tier child section for deep hierarchy validation
 * 7. Hierarchical structure validation across all levels
 * 8. Display order validation within sibling relationships
 * 9. Channel boundary preservation verification
 * 10. Multi-level navigation tree construction complete testing
 */
export async function test_api_section_hierarchical_organization(
  connection: api.IConnection,
) {
  // Step 1: Admin authentication setup
  const adminEmail = `admin.${typia.random<string & tags.Format<"uuid">>()}@platform.com`;
  const admin: IShoppingMallAdmin.IAuthorized =
    await api.functional.auth.admin.join(connection, {
      body: {
        email: adminEmail,
        firstname: RandomGenerator.name(1),
        lastname: RandomGenerator.name(1),
        adminlevel: RandomGenerator.pick([
          "super_admin",
          "department_admin",
          "support_admin",
          "viewer",
        ] as const),
        department: RandomGenerator.name(2),
      } satisfies IShoppingMallAdmin.ICreate,
    });
  typia.assert(admin);

  // Step 2: Channel creation for marketplace environment
  const channel: IShoppingMallChannel =
    await api.functional.shoppingMall.channels.create(connection, {
      body: {
        code: `channel_${typia.random<string & tags.Format<"uuid">>().substring(0, 8)}`,
        name: `${RandomGenerator.name(2)} Marketplace`,
        description: RandomGenerator.content({
          paragraphs: 2,
          sentenceMin: 8,
          sentenceMax: 15,
        }),
        currency_code: RandomGenerator.pick([
          "USD",
          "KRW",
          "EUR",
          "JPY",
          "GBP",
        ] as const),
        language: RandomGenerator.pick(["en", "ko", "ja", "zh", "de"] as const),
        time_zone: "UTC+09:00",
        commission_rate: typia.random<
          number & tags.Minimum<0> & tags.Maximum<100>
        >(),
      } satisfies IShoppingMallChannel.ICreate,
    });
  typia.assert(channel);

  // Step 3: Root-level section creation
  const rootSection: IShoppingMallSection =
    await api.functional.shoppingMall.admin.channels.sections.create(
      connection,
      {
        channelCode: channel.code,
        body: {
          parent_code: null,
          code: `root_${typia.random<string & tags.Format<"uuid">>().substring(0, 6)}`,
          name: `Root Section ${RandomGenerator.paragraph({ sentences: 2 })}`,
          type: "category",
          is_active: true,
          display_order: 1,
          description: RandomGenerator.paragraph({ sentences: 3 }),
        } satisfies IShoppingMallSection.ICreate,
      },
    );
  typia.assert(rootSection);
  TestValidator.equals(
    "root section channel",
    rootSection.channel.id,
    channel.id,
  );
  TestValidator.equals("root section parent", rootSection.parent_code, null);

  // Step 4: Parent section creation
  const parentSection: IShoppingMallSection =
    await api.functional.shoppingMall.admin.channels.sections.create(
      connection,
      {
        channelCode: channel.code,
        body: {
          parent_code: rootSection.code,
          code: `parent_${typia.random<string & tags.Format<"uuid">>().substring(0, 6)}`,
          name: `Parent Section ${RandomGenerator.paragraph({ sentences: 2 })}`,
          type: "subcategory",
          is_active: true,
          display_order: 2,
          description: RandomGenerator.paragraph({ sentences: 4 }),
        } satisfies IShoppingMallSection.ICreate,
      },
    );
  typia.assert(parentSection);
  TestValidator.equals(
    "parent section parent code",
    parentSection.parent_code,
    rootSection.code,
  );
  TestValidator.equals(
    "parent section channel",
    parentSection.channel.id,
    channel.id,
  );

  // Step 5: Child section under parent relationship
  const childSection1: IShoppingMallSection =
    await api.functional.shoppingMall.admin.channels.sections.create(
      connection,
      {
        channelCode: channel.code,
        body: {
          parent_code: parentSection.code,
          code: `child1_${typia.random<string & tags.Format<"uuid">>().substring(0, 6)}`,
          name: `Child Section 1 ${RandomGenerator.paragraph({ sentences: 2 })}`,
          type: "product",
          is_active: true,
          display_order: 1,
          description: RandomGenerator.paragraph({ sentences: 3 }),
        } satisfies IShoppingMallSection.ICreate,
      },
    );
  typia.assert(childSection1);
  TestValidator.equals(
    "child1 parent code",
    childSection1.parent_code,
    parentSection.code,
  );
  TestValidator.equals("child1 channel", childSection1.channel.id, channel.id);

  // Step 6: Second child section for sibling testing
  const childSection2: IShoppingMallSection =
    await api.functional.shoppingMall.admin.channels.sections.create(
      connection,
      {
        channelCode: channel.code,
        body: {
          parent_code: parentSection.code,
          code: `child2_${typia.random<string & tags.Format<"uuid">>().substring(0, 6)}`,
          name: `Child Section 2 ${RandomGenerator.paragraph({ sentences: 2 })}`,
          type: "promotion",
          is_active: false,
          display_order: 2,
          description: RandomGenerator.paragraph({ sentences: 3 }),
        } satisfies IShoppingMallSection.ICreate,
      },
    );
  typia.assert(childSection2);
  TestValidator.equals(
    "child2 parent code",
    childSection2.parent_code,
    parentSection.code,
  );
  TestValidator.equals("child2 channel", childSection2.channel.id, channel.id);

  // Step 7: Deep hierarchy - grandchild section
  const grandchildSection: IShoppingMallSection =
    await api.functional.shoppingMall.admin.channels.sections.create(
      connection,
      {
        channelCode: channel.code,
        body: {
          parent_code: childSection1.code,
          code: `grandchild_${typia.random<string & tags.Format<"uuid">>().substring(0, 4)}`,
          name: `Grandchild Section ${RandomGenerator.paragraph({ sentences: 2 })}`,
          type: "featured",
          is_active: true,
          display_order: 1,
          description: RandomGenerator.paragraph({ sentences: 2 }),
        } satisfies IShoppingMallSection.ICreate,
      },
    );
  typia.assert(grandchildSection);
  TestValidator.equals(
    "grandchild parent code",
    grandchildSection.parent_code,
    childSection1.code,
  );
  TestValidator.equals(
    "grandchild channel",
    grandchildSection.channel.id,
    channel.id,
  );

  // Step 8: Hierarchical organization structure validation
  TestValidator.equals(
    "root section hierarchy level",
    rootSection.parent_code,
    null,
  );
  TestValidator.equals(
    "parent section hierarchy level",
    parentSection.parent_code,
    rootSection.code,
  );
  TestValidator.equals(
    "child sections hierarchy level",
    childSection1.parent_code,
    parentSection.code,
  );
  TestValidator.equals(
    "grandchild hierarchy level",
    grandchildSection.parent_code,
    childSection1.code,
  );

  // Step 9: Display order validation
  TestValidator.predicate(
    "parent display order higher than root",
    parentSection.display_order > rootSection.display_order,
  );
  TestValidator.predicate(
    "child1 display order exists",
    typeof childSection1.display_order === "number",
  );
  TestValidator.predicate(
    "child2 display order exists",
    typeof childSection2.display_order === "number",
  );
  TestValidator.predicate(
    "grandchild display order exists",
    typeof grandchildSection.display_order === "number",
  );

  // Step 10: Channel boundary preservation validation
  const allSections = [
    rootSection,
    parentSection,
    childSection1,
    childSection2,
    grandchildSection,
  ];
  TestValidator.predicate(
    "all sections in same channel",
    allSections.every((section) => section.channel.id === channel.id),
  );
  TestValidator.predicate(
    "channel code consistency",
    allSections.every((section) => section.channel.code === channel.code),
  );
  TestValidator.predicate(
    "channel name consistency",
    allSections.every((section) => section.channel.name === channel.name),
  );

  // Step 11: Type diversity validation
  TestValidator.equals(
    "root section type",
    rootSection.section_type,
    "category",
  );
  TestValidator.equals(
    "parent section type",
    parentSection.section_type,
    "subcategory",
  );
  TestValidator.equals(
    "child1 section type",
    childSection1.section_type,
    "product",
  );
  TestValidator.equals(
    "child2 section type",
    childSection2.section_type,
    "promotion",
  );
  TestValidator.equals(
    "grandchild section type",
    grandchildSection.section_type,
    "featured",
  );

  // Step 12: Status diversity validation
  TestValidator.predicate(
    "at least one active section",
    allSections.some((s) => s.is_active),
  );
  TestValidator.predicate(
    "at least one inactive section",
    allSections.some((s) => !s.is_active),
  );
}
