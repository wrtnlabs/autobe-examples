import { IEconomicPoliticalDiscussionBoardProfile } from "@ORGANIZATION/PROJECT-api/lib/structures/IEconomicPoliticalDiscussionBoardProfile";
import { IEconomicPoliticalDiscussionBoardUser } from "@ORGANIZATION/PROJECT-api/lib/structures/IEconomicPoliticalDiscussionBoardUser";
import { IEntity } from "@ORGANIZATION/PROJECT-api/lib/structures/IEntity";
import { ArrayUtil } from "@nestia/e2e";
import { HttpException } from "@nestjs/common";
import { Prisma } from "@prisma/sdk";
import jwt from "jsonwebtoken";
import typia, { tags } from "typia";
import { v4 } from "uuid";

import { MyGlobal } from "../MyGlobal";
import { UserPayload } from "../decorators/payload/UserPayload";
import { EconomicPoliticalDiscussionBoardProfileTransformer } from "../transformers/EconomicPoliticalDiscussionBoardProfileTransformer";
import { PasswordUtil } from "../utils/PasswordUtil";
import { toISOStringSafe } from "../utils/toISOStringSafe";

export async function putEconomicPoliticalDiscussionBoardUserProfile(props: {
  user: UserPayload;
  body: IEconomicPoliticalDiscussionBoardProfile.IUpdate;
}): Promise<IEconomicPoliticalDiscussionBoardProfile> {
  // Validate display name length
  if (
    props.body.display_name.length < 2 ||
    props.body.display_name.length > 30
  ) {
    throw new HttpException("Display name must be 2-30 characters", 400);
  }
  // Validate bio length
  if (props.body.bio && props.body.bio.length > 250) {
    throw new HttpException("Bio must not exceed 250 characters", 400);
  }
  const updatedProfile =
    await MyGlobal.prisma.economic_political_discussion_board_profiles.update({
      where: { user_id: props.user.id },
      data: {
        display_name: props.body.display_name,
        bio: props.body.bio,
        updated_at: new Date().toISOString(),
      },
      ...EconomicPoliticalDiscussionBoardProfileTransformer.select(),
    });
  return await EconomicPoliticalDiscussionBoardProfileTransformer.transform(
    updatedProfile,
  );
}
