import api from "@ORGANIZATION/PROJECT-api";
import type { IAuthorizationToken } from "@ORGANIZATION/PROJECT-api/lib/structures/IAuthorizationToken";
import type { IDiscussionBoardAdmin } from "@ORGANIZATION/PROJECT-api/lib/structures/IDiscussionBoardAdmin";
import type { IDiscussionBoardSection } from "@ORGANIZATION/PROJECT-api/lib/structures/IDiscussionBoardSection";
import type { IDiscussionBoardSectionImage } from "@ORGANIZATION/PROJECT-api/lib/structures/IDiscussionBoardSectionImage";
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
import { generate_random_discussion_board_super_admin_sections_create } from "../../../generate/generate_random_discussion_board_super_admin_sections_create";
import { generate_random_discussion_board_super_admin_sections_images_create } from "../../../generate/generate_random_discussion_board_super_admin_sections_images_create";
import { prepare_random_discussion_board_section } from "../../../prepare/prepare_random_discussion_board_section";
import { prepare_random_discussion_board_section_image } from "../../../prepare/prepare_random_discussion_board_section_image";

export async function test_api_section_image_creation_success(
  connection: api.IConnection,
): Promise<void> {
  // 1. Authenticate as superAdmin
  const superAdminConnection: api.IConnection = { host: connection.host };
  const superAdminAuth = await authorize_super_admin_join(
    superAdminConnection,
    {
      body: {
        email: typia.random<string & tags.Format<"email">>(),
        password: RandomGenerator.alphaNumeric(16),
        href: typia.random<string & tags.Format<"uri">>(),
        referrer: typia.random<string & tags.Format<"uri">>(),
        ip: typia.random<string & tags.Format<"ipv4">>(),
      } satisfies IDiscussionBoardSuperAdmin.IJoin,
    },
  );
  typia.assert(superAdminAuth);
  // 2. Create an active section
  const section =
    await generate_random_discussion_board_super_admin_sections_create(
      superAdminConnection,
      {
        body: {
          name: RandomGenerator.paragraph({ sentences: 2 }),
          description: RandomGenerator.content({
            paragraphs: 1,
            sentenceMin: 3,
            sentenceMax: 5,
          }),
          status: "active",
          display_order: typia.random<
            number & tags.Type<"int32"> & tags.Minimum<1>
          >(),
        } satisfies IDiscussionBoardSection.ICreate,
      },
    );
  typia.assert(section);
  // 3. Create section image
  const imageData = {
    filename: `banner_${RandomGenerator.alphaNumeric(8)}.jpg`,
    mime_type: "image/jpeg",
    file_size: typia.random<
      number & tags.Type<"int32"> & tags.Minimum<1024> & tags.Maximum<10485760>
    >(),
    width: typia.random<
      number & tags.Type<"int32"> & tags.Minimum<100> & tags.Maximum<1920>
    >(),
    height: typia.random<
      number & tags.Type<"int32"> & tags.Minimum<100> & tags.Maximum<1080>
    >(),
    image_type: "banner" as const,
    storage_path: `/images/sections/${section.id}/banner_${RandomGenerator.alphaNumeric(8)}.jpg`,
    alt_text: RandomGenerator.paragraph({ sentences: 1 }),
  } satisfies IDiscussionBoardSectionImage.ICreate;
  const image =
    await generate_random_discussion_board_super_admin_sections_images_create(
      superAdminConnection,
      {
        body: imageData,
        params: { sectionId: section.id },
      },
    );
  typia.assert(image);
  // 4. Validate business logic (not redundant type validation)
  TestValidator.equals(
    "filename matches input",
    image.filename,
    imageData.filename,
  );
  TestValidator.equals(
    "mime_type matches input",
    image.mime_type,
    imageData.mime_type,
  );
  TestValidator.equals(
    "file_size matches input",
    image.file_size,
    imageData.file_size,
  );
  TestValidator.equals("width matches input", image.width, imageData.width);
  TestValidator.equals("height matches input", image.height, imageData.height);
  TestValidator.equals(
    "image_type matches input",
    image.image_type,
    imageData.image_type,
  );
  TestValidator.equals(
    "storage_path matches input",
    image.storage_path,
    imageData.storage_path,
  );
  TestValidator.equals(
    "alt_text matches input",
    image.alt_text,
    imageData.alt_text,
  );
}