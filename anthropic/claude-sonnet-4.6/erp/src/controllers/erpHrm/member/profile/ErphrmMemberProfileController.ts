import { TypedBody, TypedRoute } from "@nestia/core";
import { Controller } from "@nestjs/common";
import typia from "typia";

import { IErpHrmGuestSession } from "../../../../api/structures/IErpHrmGuestSession";
import { MemberAuth } from "../../../../decorators/MemberAuth";
import { MemberPayload } from "../../../../decorators/payload/MemberPayload";
import { putErpHrmMemberProfile } from "../../../../providers/putErpHrmMemberProfile";

@Controller("/erpHrm/member/profile")
export class ErphrmMemberProfileController {
  /**
   * Update the currently authenticated member's global user profile.
   *
   * This operation allows any authenticated member to modify their own global profile information. The profile is a platform-wide identity record shared across every organization the member belongs to, meaning any accepted change is immediately visible in all organizational contexts without requiring additional synchronization steps.
   *
   * The following fields can be updated in a single request:
   * - **Display name** (required): The human-readable name shown to other users throughout the platform. Must not be empty or blank. Providing an empty display name will cause the request to be rejected.
   * - **Avatar image** (optional): A URI referencing the member's profile image. May be set to a new URI to replace the current avatar, or set to null to remove the avatar entirely.
   * - **Phone number** (optional): A contact number for the member. May be set, changed, or cleared (set to null) at any time.
   *
   * Access control for this operation is strictly enforced by account ownership: only the authenticated member who owns the profile may submit updates. No other user — regardless of their organization role, permission level, or administrative status — may modify another member's global profile through this endpoint. Organization-scoped roles and permissions govern organization-scoped data only; the global user profile is governed solely by the platform-level account ownership. Unauthenticated requests are rejected.
   *
   * If all submitted values are identical to the currently stored values (a no-op update), the system accepts the request without error and returns the unchanged profile data. A no-op update does not trigger cross-organization propagation events since no data has actually changed.
   *
   * Upon a successful update that contains at least one changed field, the system immediately reflects the new profile values across every organization the member belongs to. No per-organization confirmation or update step is required. A profile-updated event is emitted carrying the updated display name, avatar reference, and phone number so that any clients with cached profile data can refresh their representation of the user.
   *
   * @param connection
   * @param body Updated profile information including display name, optional avatar URI, and optional phone number
   * @x-autobe-authorization-type null
   * @x-autobe-authorization-actor member
   * @x-autobe-specification Implementation steps for PUT /profile:
   *
   * 1. **Authentication**: Extract the authenticated member identity from the session/JWT token. Reject the request with 401 Unauthorized if no valid session exists.
   *
   * 2. **Load current profile**: Query the UserProfile record associated with the authenticated member's user account (join erp_hrm_members with the user profile table by member id). Return 404 if no profile exists (should not occur for valid members since profile is created at registration).
   *
   * 3. **Input validation**:
   *    - Validate that `displayName` is provided and is not an empty or whitespace-only string. Reject with 422 Unprocessable Entity if empty.
   *    - `avatarUrl` is optional; if provided must be a valid URI format or null.
   *    - `phoneNumber` is optional; if provided may be any string value or null.
   *
   * 4. **No-op detection**: Compare the incoming field values with the currently stored values. If all fields are identical, return the current profile data immediately without performing a DB write and without emitting any event.
   *
   * 5. **Persist changes**: Update the UserProfile record in the database with the new values. Set `updated_at` timestamp to the current time. Perform the update within a transaction.
   *
   * 6. **Propagation**: Since the profile is global, no per-organization update is required. The updated data is automatically visible across all organizations.
   *
   * 7. **Emit event**: If at least one field changed, emit a profile-updated event with the payload: { userId, displayName, avatarUrl, phoneNumber }.
   *
   * 8. **Response**: Return the complete updated IErpHrmUserProfile object with all current field values.
   *
   * Edge cases:
   * - Attempt to update profile of another user: reject with 403 Forbidden (this endpoint always targets the authenticated user's own profile, so this scenario cannot occur via path manipulation; ensure no body field allows specifying a different user ID).
   * - Concurrent updates: last-write-wins is acceptable since profile updates are user-initiated and infrequent.
   * @nestia Generated by Nestia - https://github.com/samchon/nestia
   */
  @TypedRoute.Put()
  public async update(
    @MemberAuth()
    member: MemberPayload,
    @TypedBody()
    body: IErpHrmGuestSession.IUpdate,
  ): Promise<IErpHrmGuestSession> {
    try {
      return await putErpHrmMemberProfile({
        member,
        body,
      });
    } catch (error) {
      console.log(error);
      throw error;
    }
  }
}
