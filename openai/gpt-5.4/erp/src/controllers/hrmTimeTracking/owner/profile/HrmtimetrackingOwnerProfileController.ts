import { TypedBody, TypedRoute } from "@nestia/core";
import { Controller } from "@nestjs/common";
import typia from "typia";

import { IHrmTimeTrackingManagerSession } from "../../../../api/structures/IHrmTimeTrackingManagerSession";
import { OwnerAuth } from "../../../../decorators/OwnerAuth";
import { OwnerPayload } from "../../../../decorators/payload/OwnerPayload";
import { putHrmTimeTrackingOwnerProfile } from "../../../../providers/putHrmTimeTrackingOwnerProfile";

@Controller("/hrmTimeTracking/owner/profile")
export class HrmtimetrackingOwnerProfileController {
  /**
   * Update the authenticated user's global personal profile.
   *
   * This operation maintains the single shared user profile that represents a person's platform-wide identity details across the HRM time tracking service. According to the user profile requirements, this profile is the global personal profile attached to a user account and contains presentation and contact attributes such as display name, avatar image, and phone number. The endpoint updates the existing shared profile record used for recognition and contact throughout the workspace rather than any organization-specific employee information.
   *
   * Security and ownership are central to this operation. The platform rules state that profile maintenance is a personal account action performed by the profile owner, and that if a user attempts to edit another person's global user profile, the request must be rejected. For that reason, the target profile is resolved entirely from the authenticated session of an owner, manager, or employee actor, and the API does not accept a profile ID, employee ID, or organization ID in the path. If the caller is not authenticated, the update must be denied.
   *
   * This operation must preserve the shared-profile model across multi-organization membership. The requirements explicitly state that the system maintains exactly one global user profile for each user account, uses the same profile across all organizations the user belongs to, and must not create separate organization-specific profile variations. A successful update to display name, avatar image, or phone number therefore changes the one existing global profile record and causes the updated values to be reflected anywhere the user's shared profile is shown, including after organization switching.
   *
   * From a data perspective, this endpoint updates only profile attributes and must keep them separate from organization employee records. The business rules specify that display name, avatar image, and phone number are profile attributes rather than organization-level employee attributes, and any request that attempts to treat profile information as organization-specific employee data must be rejected. Consumers should use this endpoint for personal identity presentation data only, while organization membership, role, department, and employment details remain managed through their own domain-specific APIs.
   *
   * After a successful update, the latest saved shared profile should be returned so client applications can immediately refresh account views, workspace headers, and other identity displays. In addition, the requirements state that a user profile change event shall be published when the display name, avatar image, or phone number is successfully changed, identifying the affected user and including the changed presentation details. Clients that also rely on real-time updates should treat this operation as the write-side companion to those event-driven profile refresh behaviors.
   *
   * Expected failures include unauthenticated access, attempts to update another user's profile context, and invalid requests that would imply more than one profile per user account or would misclassify profile data as organization-specific employee data. The implementation should always update the existing global profile for the authenticated user and never create per-organization variants as a side effect.
   *
   * @param connection
   * @param body Updated values for the authenticated user's global profile
   * @x-autobe-authorization-type null
   * @x-autobe-authorization-actor owner
   * @x-autobe-specification Resolve the caller from the authenticated session and map that identity to the single global user profile for the signed-in account.
   *
   * Load the existing shared profile record for the authenticated user inside a transaction or equivalent atomic update boundary. Validate that the operation is targeting the caller's own profile context only. Do not accept or infer any organization-scoped override record, and do not route the write through employee-specific data structures.
   *
   * Apply the fields from `IHrmTimeTrackingUserProfile.IUpdate` to the existing global profile record. Restrict mutable fields to the global presentation/contact attributes defined by requirements: display name, avatar image, and phone number. Do not create a second profile row or any organization-specific variant. If the platform stores profile data in the actor tables or a separate aggregate, implementation must still enforce the logical invariant of exactly one global profile per user account.
   *
   * Reject the request when authentication is missing, when the resolved target does not correspond to the caller's own profile, or when the payload attempts to express organization-specific employee profile semantics. Also reject attempts that would result in duplicate profile identity for the same user account.
   *
   * Persist the updated shared profile and return the canonical updated profile DTO. After commit, publish the user profile change event required by the functional requirements. The event should identify the affected user and include the changed profile presentation details. If only one of display name, avatar image, or phone number changed, publish the event with only the changed detail as required.
   *
   * Ensure that any cached or derived identity views used across organization contexts are refreshed from the same shared profile source so subsequent reads in other workspace contexts reflect the latest values consistently.
   * @nestia Generated by Nestia - https://github.com/samchon/nestia
   */
  @TypedRoute.Put()
  public async update(
    @OwnerAuth()
    owner: OwnerPayload,
    @TypedBody()
    body: IHrmTimeTrackingManagerSession.IUpdate,
  ): Promise<IHrmTimeTrackingManagerSession> {
    try {
      return await putHrmTimeTrackingOwnerProfile({
        owner,
        body,
      });
    } catch (error) {
      console.log(error);
      throw error;
    }
  }
}
