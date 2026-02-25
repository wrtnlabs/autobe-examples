import { IDiscussionBoardAdministratorDistributionStatistic } from "@ORGANIZATION/PROJECT-api/lib/structures/IDiscussionBoardAdministratorDistributionStatistic";
import { IDiscussionBoardAdministratorPromotionRequest } from "@ORGANIZATION/PROJECT-api/lib/structures/IDiscussionBoardAdministratorPromotionRequest";
import { IDiscussionBoardSection } from "@ORGANIZATION/PROJECT-api/lib/structures/IDiscussionBoardSection";
import { IDiscussionBoardSectionImage } from "@ORGANIZATION/PROJECT-api/lib/structures/IDiscussionBoardSectionImage";
import { IEntity } from "@ORGANIZATION/PROJECT-api/lib/structures/IEntity";
import { IPage } from "@ORGANIZATION/PROJECT-api/lib/structures/IPage";
import { IPageIDiscussionBoardAdministratorDistributionStatistic } from "@ORGANIZATION/PROJECT-api/lib/structures/IPageIDiscussionBoardAdministratorDistributionStatistic";
import { IPageIDiscussionBoardAdministratorPromotionRequest } from "@ORGANIZATION/PROJECT-api/lib/structures/IPageIDiscussionBoardAdministratorPromotionRequest";
import { IPageIDiscussionBoardSection } from "@ORGANIZATION/PROJECT-api/lib/structures/IPageIDiscussionBoardSection";
import { IPageIDiscussionBoardSectionImage } from "@ORGANIZATION/PROJECT-api/lib/structures/IPageIDiscussionBoardSectionImage";
import { ArrayUtil } from "@nestia/e2e";
import { HttpException } from "@nestjs/common";
import { Prisma } from "@prisma/sdk";
import jwt from "jsonwebtoken";
import typia, { tags } from "typia";
import { v4 } from "uuid";

import { MyGlobal } from "../MyGlobal";
import { AdminPayload } from "../decorators/payload/AdminPayload";
import { PasswordUtil } from "../utils/PasswordUtil";
import { toISOStringSafe } from "../utils/toISOStringSafe";

export async function patchDiscussionBoardAdminSectionsSectionIdImages(props: {
  admin: AdminPayload;
  sectionId: string & tags.Format<"uuid">;
  body: IDiscussionBoardSectionImage.IRequest;
}): Promise<IPageIDiscussionBoardSectionImage.ISummary> {
  // Verify section exists and is active
  const section =
    await MyGlobal.prisma.discussion_board_sections.findUniqueOrThrow({
      where: {
        id: props.sectionId,
        status: "active",
        deleted_at: null,
      },
    });
  // Check if admin has permissions for this section
  const sectionAdmin =
    await MyGlobal.prisma.discussion_board_section_administrators.findFirst({
      where: {
        discussion_board_section_id: props.sectionId,
        discussion_board_admin_id: props.admin.id,
      },
    });
  if (!sectionAdmin) {
    throw new HttpException(
      "Admin does not have permission to access this section",
      403,
    );
  }
  // Build WHERE clause with filtering
  const whereInput = {
    discussion_board_section_id: props.sectionId,
    ...(props.body.image_type && { image_type: props.body.image_type }),
    ...(props.body.search && {
      OR: [
        { filename: { contains: props.body.search, mode: "insensitive" } },
        { alt_text: { contains: props.body.search, mode: "insensitive" } },
      ],
    }),
  } satisfies Prisma.discussion_board_section_imagesWhereInput;
  // Pagination parameters with validation
  const currentPage = Math.max(1, props.body.page ?? 1);
  const limit = Math.min(Math.max(1, props.body.limit ?? 100), 100);
  const skip = (currentPage - 1) * limit;
  // Fetch paginated images
  const data = await MyGlobal.prisma.discussion_board_section_images.findMany({
    where: whereInput,
    skip,
    take: limit,
    orderBy: { filename: "asc" },
  });
  // Total count for pagination
  const total = await MyGlobal.prisma.discussion_board_section_images.count({
    where: whereInput,
  });
  // Transform to DTO following exact ISummary specification
  const summaryData = data.map(
    (image) =>
      ({
        id: image.id as string & tags.Format<"uuid">,
        filename: image.filename,
        mime_type: image.mime_type,
        file_size: image.file_size as number & tags.Type<"int32">,
        width: image.width as number & tags.Type<"int32">,
        height: image.height as number & tags.Type<"int32">,
        image_type: image.image_type,
        alt_text: image.alt_text,
      }) satisfies IDiscussionBoardSectionImage.ISummary,
  );
  // Fix: Use correct pagination property names according to IPage.IPagination
  return {
    pagination: {
      page: currentPage satisfies number as number satisfies number &
        tags.Type<"int32"> &
        tags.Minimum<0>,
      limit: limit satisfies number as number satisfies number &
        tags.Type<"int32"> &
        tags.Minimum<0>,
      total: total satisfies number as number satisfies number &
        tags.Type<"int32"> &
        tags.Minimum<0>,
      pages: Math.ceil(
        total / limit,
      ) satisfies number as number satisfies number &
        tags.Type<"int32"> &
        tags.Minimum<0>,
    } satisfies IPage.IPagination,
    data: summaryData,
  };
}
