import { ForbiddenException } from '@nestjs/common';

import { MyGlobal } from '../../MyGlobal';
import { jwtAuthorize } from './jwtAuthorize';
import { MemberPayload } from '../../decorators/payload/MemberPayload';

export async function memberAuthorize(request: {
  headers: {
    authorization?: string;
  };
}): Promise<MemberPayload> {
  const payload: MemberPayload = jwtAuthorize({ request }) as MemberPayload;

  if (payload.type !== 'member') {
    throw new ForbiddenException(`You're not a member`);
  }

  const member = await MyGlobal.prisma.discussion_board_members.findUnique({
    where: { id: payload.id },
  });

  if (!member) {
    throw new ForbiddenException('Member not found');
  }

  return payload;
}