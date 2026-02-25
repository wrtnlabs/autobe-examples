import api from "@ORGANIZATION/PROJECT-api";
import type { IAuthorizationToken } from "@ORGANIZATION/PROJECT-api/lib/structures/IAuthorizationToken";
import type { IDiscussionBoardAdmin } from "@ORGANIZATION/PROJECT-api/lib/structures/IDiscussionBoardAdmin";
import type { IDiscussionBoardSection } from "@ORGANIZATION/PROJECT-api/lib/structures/IDiscussionBoardSection";
import type { IDiscussionBoardSectionImage } from "@ORGANIZATION/PROJECT-api/lib/structures/IDiscussionBoardSectionImage";
import { IEntity } from "@ORGANIZATION/PROJECT-api/lib/structures/IEntity";
import { DeepPartial } from "@ORGANIZATION/PROJECT-api/lib/typings/DeepPartial";
import { ArrayUtil, RandomGenerator, TestValidator } from "@nestia/e2e";
import { IConnection } from "@nestia/fetcher";
import { randint } from "tstl";
import typia, { tags } from "typia";

import { authorize_admin_join } from "../../../authorize/authorize_admin_join";
import { authorize_admin_login } from "../../../authorize/authorize_admin_login";
import { authorize_admin_refresh } from "../../../authorize/authorize_admin_refresh";
import { generate_random_discussion_board_admin_sections_create } from "../../../generate/generate_random_discussion_board_admin_sections_create";
import { generate_random_discussion_board_admin_sections_images_create } from "../../../generate/generate_random_discussion_board_admin_sections_images_create";
import { prepare_random_discussion_board_section } from "../../../prepare/prepare_random_discussion_board_section";
import { prepare_random_discussion_board_section_image } from "../../../prepare/prepare_random_discussion_board_section_image";

/**
 * Test creation of an icon image for section branding.
 * Icon images are small visuals used for section identification and navigation.
 */
export async function test_api_section_image_creation_icon_type(
  connection: api.IConnection,
): Promise<void> {
  // Create admin connection and authenticate
  const adminConnection: api.IConnection = { host: connection.host };
  const admin = await authorize_admin_join(adminConnection, {
    body: {
      email: typia.random<string & tags.Format<"email">>(),
      password: RandomGenerator.alphaNumeric(16),
      display_name: RandomGenerator.name(),
      href: typia.random<string & tags.Format<"uri">>(),
      referrer: typia.random<string & tags.Format<"uri">>(),
      ip: typia.random<string & tags.Format<"ipv4">>(),
    },
  });
  typia.assert(admin);
  // Create a section to associate the icon with using utility function if available
  const section = await api.functional.discussionBoard.admin.sections.create(
    adminConnection,
    {
      body: {
        name: RandomGenerator.paragraph({ sentences: 2 }),
        description: RandomGenerator.paragraph({ sentences: 3 }),
        status: "active",
        display_order: typia.random<
          number & tags.Type<"int32"> & tags.Minimum<0>
        >(),
      } satisfies IDiscussionBoardSection.ICreate,
    },
  );
  typia.assert(section);
  // Generate random icon-appropriate dimensions (32-128px range)
  const iconWidth = typia.random<
    number & tags.Type<"int32"> & tags.Minimum<32> & tags.Maximum<128>
  >();
  const iconHeight = typia.random<
    number & tags.Type<"int32"> & tags.Minimum<32> & tags.Maximum<128>
  >();
  // Create icon image with small dimensions appropriate for icons
  const iconImage =
    await api.functional.discussionBoard.admin.sections.images.create(
      adminConnection,
      {
        sectionId: section.id,
        body: {
          filename: `section-icon-${RandomGenerator.alphaNumeric(8)}.png`,
          mime_type: "image/png",
          file_size: typia.random<
            number &
              tags.Type<"int32"> &
              tags.Minimum<100> &
              tags.Maximum<50000>
          >(),
          width: iconWidth,
          height: iconHeight,
          image_type: "icon",
          storage_path: `/sections/${section.id}/images/icon-${typia.random<string & tags.Format<"uuid">>()}.png`,
          alt_text: `Icon for ${section.name}`,
        } satisfies IDiscussionBoardSectionImage.ICreate,
      },
    );
  typia.assert(iconImage);
  // Validate icon-specific properties
  TestValidator.equals("image type is icon", iconImage.image_type, "icon");
  TestValidator.predicate(
    "icon dimensions small",
    iconImage.width <= 128 && iconImage.height <= 128,
  );
  TestValidator.notEquals("storage path generated", iconImage.storage_path, "");
  TestValidator.predicate("file size recorded", iconImage.file_size > 0);
  TestValidator.predicate(
    "filename contains section-icon",
    iconImage.filename.includes("section-icon"),
  );
  TestValidator.equals(
    "alt text stored",
    iconImage.alt_text,
    `Icon for ${section.name}`,
  );
}
