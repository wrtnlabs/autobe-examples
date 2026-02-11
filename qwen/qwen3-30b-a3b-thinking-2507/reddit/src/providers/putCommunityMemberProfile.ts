import { ICommunityMember } from "@ORGANIZATION/PROJECT-api/lib/structures/ICommunityMember";
import { IEntity } from "@ORGANIZATION/PROJECT-api/lib/structures/IEntity";
import { ArrayUtil } from "@nestia/e2e";
import { HttpException } from "@nestjs/common";
import { Prisma } from "@prisma/sdk";
import jwt from "jsonwebtoken";
import typia, { tags } from "typia";
import { v4 } from "uuid";

import { MyGlobal } from "../MyGlobal";
import { MemberPayload } from "../decorators/payload/MemberPayload";
import { CommunityMemberTransformer } from "../transformers/CommunityMemberTransformer";
import { PasswordUtil } from "../utils/PasswordUtil";
import { toISOStringSafe } from "../utils/toISOStringSafe";

export async function putCommunityMemberProfile(props: {
  member: MemberPayload;
  body: ICommunityMember.IUpdate;
}): Promise<ICommunityMember> {
  // Validate display_name length
  if (
    props.body.display_name !== undefined &&
    props.body.display_name !== null
  ) {
    if (
      props.body.display_name.length < 3 ||
      props.body.display_name.length > 50
    ) {
      throw new HttpException(
        "Display name must be between 3 and 50 characters",
        400,
      );
    }
  }
  const data: any = {};
  if (props.body.display_name !== undefined) {
    data.display_name = props.body.display_name;
  }
  if (props.body.bio !== undefined) {
    data.bio =
      props.body.bio === null ? null : props.body.bio.substring(0, 500);
  }
  if (props.body.avatar_url !== undefined) {
    data.avatar_url = props.body.avatar_url;
  }
  if (Object.keys(data).length === 0) {
    throw new HttpException("No changes provided", 400);
  }
  const updatedMember = await MyGlobal.prisma.community_members.update({
    where: { id: props.member.id },
    data: data,
  });
  return await CommunityMemberTransformer.transform(updatedMember);
}
